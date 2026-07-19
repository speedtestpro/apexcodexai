import { createFileRoute } from "@tanstack/react-router";
import { upgrades } from "@/lib/upgrade-store.server";

const OWNER_ID = "8040684574";

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) return new Response("no token", { status: 500 });

        let update: any;
        try { update = await request.json(); } catch { return Response.json({ ok: true }); }

        const cb = update?.callback_query;
        if (!cb) return Response.json({ ok: true });

        const fromId = String(cb.from?.id ?? "");
        const data = String(cb.data ?? "");
        const [action, id, planIdFromCb] = data.split(":");

        // Only owner can confirm/reject
        if (fromId !== OWNER_ID) {
          await answerCallback(token, cb.id, "Нет доступа", true);
          return Response.json({ ok: true });
        }

        let rec = id ? upgrades.get(id) : undefined;
        // Different worker isolate may not share the in-memory map — rebuild
        // a minimal record from callback_data so status polling still works.
        if (!rec && id && planIdFromCb) {
          rec = {
            id, planId: planIdFromCb, planLabel: planIdFromCb,
            price: "", contact: "", method: "", note: "", userName: "",
            status: "pending", createdAt: Date.now(),
          };
          upgrades.set(id, rec);
        }
        if (!rec) {
          await answerCallback(token, cb.id, "Заявка не найдена или устарела", true);
          return Response.json({ ok: true });
        }

        if (action === "confirm") {
          rec.status = "confirmed";
          await answerCallback(token, cb.id, "✅ Тариф выдан пользователю", false);
          await editMessage(token, cb.message?.chat?.id, cb.message?.message_id,
            (cb.message?.text ?? "") + `\n\n✅ Подтверждено — тариф ${rec.planLabel} выдан.`);
        } else if (action === "reject") {
          rec.status = "rejected";
          await answerCallback(token, cb.id, "Заявка отклонена", false);
          await editMessage(token, cb.message?.chat?.id, cb.message?.message_id,
            (cb.message?.text ?? "") + `\n\n✖ Отклонено.`);
        } else {
          await answerCallback(token, cb.id, "Неизвестное действие", true);
        }

        return Response.json({ ok: true });
      },
    },
  },
});

async function answerCallback(token: string, cbId: string, text: string, alert: boolean) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ callback_query_id: cbId, text, show_alert: alert }),
    });
  } catch {}
}

async function editMessage(token: string, chatId: any, messageId: any, text: string) {
  if (!chatId || !messageId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId, text }),
    });
  } catch {}
}