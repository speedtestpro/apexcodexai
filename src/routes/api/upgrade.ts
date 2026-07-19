import { createFileRoute } from "@tanstack/react-router";
import { upgrades, newUpgradeId, gcUpgrades } from "@/lib/upgrade-store.server";

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

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}