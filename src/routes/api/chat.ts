import { createFileRoute } from "@tanstack/react-router";
import { streamText, type ModelMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { getModel } from "@/lib/models";

type InAttachment = { mimeType: string; dataUrl: string; name?: string; kind: "image" | "file" };
type InMessage = { role: "user" | "assistant" | "system"; content: string; attachments?: InAttachment[] };
type Body = {
  messages?: InMessage[];
  modelId?: string;
  systemPrompt?: string;
  userName?: string;
};

function buildSystem(userSystem: string, userName: string, modelLabel: string) {
  const persona = `Ты — ApexCode, продвинутый AI-ассистент от компании Seulop. Модель: ${modelLabel}. Отвечай на языке пользователя (по умолчанию — русский). Будь точным, ясным, дружелюбным.`;
  const projectInstr = `Когда пользователь просит СОЗДАТЬ ПРОЕКТ (сайт, приложение, скрипт, набор файлов) — выдай все файлы отдельными код-блоками в формате:\n\n\u0060\u0060\u0060<lang> path=<относительный/путь.ext>\n<содержимое файла>\n\u0060\u0060\u0060\n\nИспользуй один блок на каждый файл. Раскладывай файлы в правильные папки (src/, public/, package.json в корне и т.д.). После всех блоков кратко объясни структуру. Пользователь сможет скачать всё как .zip.`;
  const nameLine = userName ? `Обращайся к пользователю: ${userName}.` : "";
  const custom = userSystem?.trim() ? `\n\nДополнительные инструкции пользователя:\n${userSystem.trim()}` : "";
  return `${persona}\n${nameLine}\n\n${projectInstr}${custom}`.trim();
}

function toModelMessages(msgs: InMessage[]): ModelMessage[] {
  return msgs.map((m) => {
    if (m.role === "system") return { role: "system", content: m.content };
    if (m.role === "assistant") return { role: "assistant", content: m.content };
    const parts: Array<
      | { type: "text"; text: string }
      | { type: "image"; image: string; mediaType?: string }
      | { type: "file"; data: string; mediaType: string }
    > = [];
    if (m.content?.trim()) parts.push({ type: "text", text: m.content });
    for (const a of m.attachments ?? []) {
      if (a.kind === "image" || a.mimeType.startsWith("image/")) {
        parts.push({ type: "image", image: a.dataUrl, mediaType: a.mimeType });
      } else {
        parts.push({ type: "file", data: a.dataUrl, mediaType: a.mimeType });
      }
    }
    return { role: "user", content: parts.length ? parts : [{ type: "text", text: "" }] } as ModelMessage;
  });
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const messages = body.messages;
        if (!Array.isArray(messages)) return new Response("messages required", { status: 400 });
        const model = getModel(body.modelId ?? "apex-flash");

        const gateway = createLovableAiGatewayProvider(key);
        const system = buildSystem(body.systemPrompt ?? "", body.userName ?? "", model.label);

        // Image-generation branch (Apex Vision)
        if (model.gateway.startsWith("openai/gpt-image")) {
          try {
            const lastUser = [...messages].reverse().find((m) => m.role === "user");
            const prompt = (lastUser?.content ?? "").trim() || "beautiful abstract art";
            const imgRes = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
              method: "POST",
              headers: {
                "Lovable-API-Key": key,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: model.gateway,
                prompt,
                quality: "low",
              }),
            });
            if (!imgRes.ok) {
              const t = await imgRes.text().catch(() => "");
              return new Response(`Image error: ${t}`, { status: imgRes.status });
            }
            const data = (await imgRes.json()) as {
              data?: Array<{ b64_json?: string; url?: string }>;
            };
            const first = data.data?.[0];
            const src = first?.b64_json
              ? `data:image/png;base64,${first.b64_json}`
              : first?.url ?? "";
            const body = src
              ? `Готово ✨\n\n![image](${src})`
              : "Не удалось сгенерировать изображение.";
            return new Response(body, {
              headers: { "content-type": "text/plain; charset=utf-8" },
            });
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Image error";
            return new Response(msg, { status: 500 });
          }
        }

        try {
          const result = streamText({
            model: gateway(model.gateway),
            system,
            messages: toModelMessages(messages),
          });
          return result.toTextStreamResponse();
        } catch (err) {
          const msg = err instanceof Error ? err.message : "AI error";
          return new Response(msg, { status: 500 });
        }
      },
    },
  },
});