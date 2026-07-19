import { createFileRoute } from "@tanstack/react-router";
import { upgrades } from "@/lib/upgrade-store.server";
import { createHash, timingSafeEqual } from "crypto";

const OWNER_ID = "8040684574";

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env.TELEGRAM_BOT_TOKEN;

        // Always parse the update first so we can answer the callback,
        // even if config is broken. Telegram considers the button "loading"
        // until answerCallbackQuery is received.
        let update: any = null;
        try {
          update = await request.json();
        } catch {
          return Response.json({ ok: true });
        }

        const cb = update?.callback_query;
        if (!cb) return Response.json({ ok: true });

        // If we don't have a token we still must return 200 quickly so
        // Telegram stops retrying. Nothing we can do without a token.
        if (!token) {
          console.error("[telegram/webhook] TELEGRAM_BOT_TOKEN is not set");
          return Response.json({ ok: true });
        }

        const expectedSecret = deriveTelegramWebhookSecret(token);
        const actualSecret = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
        if (!safeEqual(actualSecret, expectedSecret)) {
          console.error("[telegram/webhook] invalid Telegram webhook secret");
          return new Response("Unauthorized", { status: 401 });
        }

        const cbId: string = cb.id;
        const fromId = String(cb.from?.id ?? "");
        const data = String(cb.data ?? "");
        const [action, id, planIdFromCb] = data.split(":");

        try {
          // 1) Access check — answer immediately, return.
          if (fromId !== OWNER_ID) {
            await answerCallback(token, cbId, "Нет доступа", true);
            return Response.json({ ok: true });
          }

          // 2) Resolve / rebuild the record.
          let rec = id ? upgrades.get(id) : undefined;
          if (!rec && id && planIdFromCb) {
            rec = {
              id,
              planId: planIdFromCb,
              planLabel: planIdFromCb,
              price: "",
              contact: "",
              method: "",
              note: "",
              userName: "",
              status: "pending",
              createdAt: Date.now(),
            };
            upgrades.set(id, rec);
          }

          if (!rec) {
            await answerCallback(
              token,
              cbId,
              "Заявка не найдена или устарела",
              true,
            );
            return Response.json({ ok: true });
          }

          // 3) Handle action.
          // IMPORTANT: answer the callback FIRST so the button stops spinning,
          // then edit the message. Never let Telegram wait on the edit call.
          if (action === "confirm") {
            rec.status = "confirmed";
            await answerCallback(token, cbId, "✅ Тариф выдан пользователю", false);
            await editMessage(
              token,
              cb.message?.chat?.id,
              cb.message?.message_id,
              (cb.message?.text ?? "") +
                `\n\n✅ Подтверждено — тариф ${rec.planLabel} выдан.`,
            );
          } else if (action === "reject") {
            rec.status = "rejected";
            await answerCallback(token, cbId, "Заявка отклонена", false);
            await editMessage(
              token,
              cb.message?.chat?.id,
              cb.message?.message_id,
              (cb.message?.text ?? "") + `\n\n✖ Отклонено.`,
            );
          } else {
            await answerCallback(token, cbId, "Неизвестное действие", true);
          }
        } catch (err) {
          console.error("[telegram/webhook] handler error", err);
          // Best-effort: try to close the spinner so the user isn't stuck.
          try {
            await answerCallback(token, cbId, "Ошибка обработки", true);
          } catch {}
        }

        return Response.json({ ok: true });
      },
    },
  },
});

async function answerCallback(
  token: string,
  cbId: string,
  text: string,
  alert: boolean,
) {
  try {
    const res = await fetchWithTimeout(
      `https://api.telegram.org/bot${token}/answerCallbackQuery`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          callback_query_id: cbId,
          text,
          show_alert: alert,
        }),
      },
      1800,
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        `[telegram/webhook] answerCallbackQuery failed ${res.status}: ${body}`,
      );
    }
  } catch (err) {
    console.error("[telegram/webhook] answerCallbackQuery threw", err);
  }
}

async function editMessage(
  token: string,
  chatId: any,
  messageId: any,
  text: string,
) {
  if (!chatId || !messageId) return;
  try {
    const res = await fetchWithTimeout(
      `https://api.telegram.org/bot${token}/editMessageText`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text,
        }),
      },
      2500,
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        `[telegram/webhook] editMessageText failed ${res.status}: ${body}`,
      );
    }
  } catch (err) {
    console.error("[telegram/webhook] editMessageText threw", err);
  }
}

function deriveTelegramWebhookSecret(token: string) {
  return createHash("sha256").update(`telegram-webhook:${token}`).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
