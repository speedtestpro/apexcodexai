import { createFileRoute } from "@tanstack/react-router";
import { upgrades, newUpgradeId, gcUpgrades } from "@/lib/upgrade-store.server";
import { createHash } from "crypto";

const OWNER_ID = "8040684574";

type Body = {
  planId?: string;
  plan?: string;
  price?: string;
  contact?: string;
  method?: string;
  note?: string;
  userName?: string;
};

export const Route = createFileRoute("/api/upgrade")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) return new Response("Telegram not configured", { status: 500 });
        let body: Body;
        try { body = (await request.json()) as Body; } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const planId = (body.planId ?? "").toString().slice(0, 20);
        const plan = (body.plan ?? "").toString().slice(0, 40);
        const price = (body.price ?? "").toString().slice(0, 20);
        const contact = (body.contact ?? "").toString().slice(0, 200);
        const method = (body.method ?? "").toString().slice(0, 60);
        const note = (body.note ?? "").toString().slice(0, 500);
        const userName = (body.userName ?? "").toString().slice(0, 60);
        if (!contact || !plan || !planId) return new Response("Missing fields", { status: 400 });

        gcUpgrades();
        const id = newUpgradeId();
        upgrades.set(id, {
          id, planId, planLabel: plan, price, contact, method, note, userName,
          status: "pending", createdAt: Date.now(),
        });

        const webhookReady = await ensureTelegramWebhook(token, request);
        if (!webhookReady.ok) {
          upgrades.delete(id);
          return new Response(`Telegram webhook error: ${webhookReady.error}`, { status: 502 });
        }

        const text =
          `🟡 <b>ApexCode — новая заявка на оплату</b>\n\n` +
          `<b>Тариф:</b> ${escapeHtml(plan)} (${escapeHtml(price)})\n` +
          `<b>Пользователь:</b> ${escapeHtml(userName || "—")}\n` +
          `<b>Контакт:</b> ${escapeHtml(contact)}\n` +
          `<b>Способ оплаты:</b> ${escapeHtml(method || "—")}\n` +
          (note ? `<b>Комментарий:</b> ${escapeHtml(note)}\n` : "") +
          `\n<code>id: ${id}</code>`;

        const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            chat_id: OWNER_ID,
            text,
            parse_mode: "HTML",
            disable_web_page_preview: true,
            reply_markup: {
              inline_keyboard: [[
                { text: "✅ Подтвердить оплату", callback_data: `confirm:${id}:${planId}` },
                { text: "✖ Отклонить", callback_data: `reject:${id}:${planId}` },
              ]],
            },
          }),
        });
        if (!tg.ok) {
          const errText = await tg.text().catch(() => "");
          return new Response(`Telegram error: ${errText}`, { status: 502 });
        }
        try {
          const data = await tg.json() as { result?: { message_id?: number } };
          const rec = upgrades.get(id);
          if (rec && data.result?.message_id) rec.messageId = data.result.message_id;
        } catch {}
        return Response.json({ ok: true, id });
      },
    },
  },
});

type WebhookResult = { ok: true } | { ok: false; error: string };

const webhookCache = globalThis as unknown as {
  __apexTelegramWebhook?: { url: string; checkedAt: number };
};

async function ensureTelegramWebhook(token: string, request: Request): Promise<WebhookResult> {
  const webhookUrl = getTelegramWebhookUrl(request);
  if (!webhookUrl) return { ok: false, error: "public HTTPS webhook URL is unavailable" };

  const cached = webhookCache.__apexTelegramWebhook;
  if (cached?.url === webhookUrl && Date.now() - cached.checkedAt < 10 * 60 * 1000) {
    return { ok: true };
  }

  try {
    const res = await fetchWithTimeout(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: deriveTelegramWebhookSecret(token),
        allowed_updates: ["callback_query"],
        drop_pending_updates: false,
      }),
    }, 4500);

    const body = await res.text().catch(() => "");
    if (!res.ok) return { ok: false, error: body || `HTTP ${res.status}` };

    const data = JSON.parse(body || "{}") as { ok?: boolean; description?: string };
    if (!data.ok) return { ok: false, error: data.description || body || "setWebhook failed" };

    webhookCache.__apexTelegramWebhook = { url: webhookUrl, checkedAt: Date.now() };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "setWebhook failed" };
  }
}

function getTelegramWebhookUrl(request: Request) {
  const configured = process.env.TELEGRAM_WEBHOOK_URL?.trim();
  if (configured) return configured;

  const originHeader = request.headers.get("origin");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  let origin = originHeader?.startsWith("https://") ? originHeader : "";
  if (!origin && forwardedProto === "https" && forwardedHost) origin = `https://${forwardedHost}`;

  if (!origin) {
    const url = new URL(request.url);
    if (url.protocol === "https:") origin = url.origin;
  }
  if (!origin) return null;

  const url = new URL(origin);
  const previewMatch = url.hostname.match(/^id-preview--(.+)\.(.+)$/);
  if (previewMatch) {
    origin = `${url.protocol}//project--${previewMatch[1]}-dev.${previewMatch[2]}`;
  }

  const projectPreviewMatch = url.hostname.match(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.lovableproject\.com$/i,
  );
  if (projectPreviewMatch) {
    origin = `https://project--${projectPreviewMatch[1]}-dev.lovable.app`;
  }

  return `${origin}/api/public/telegram/webhook`;
}

function deriveTelegramWebhookSecret(token: string) {
  return createHash("sha256").update(`telegram-webhook:${token}`).digest("base64url");
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

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}