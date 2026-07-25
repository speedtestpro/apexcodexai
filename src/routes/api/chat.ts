import { createFileRoute } from "@tanstack/react-router";
import { streamText, type ModelMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { APEX_MODELS } from "@/lib/models";
import { webSearch, formatWebSearchForPrompt } from "@/lib/websearch.server";

type InAttachment = { mimeType: string; dataUrl: string; name?: string; kind: "image" | "file" };
type InMessage = { role: "user" | "assistant" | "system"; content: string; attachments?: InAttachment[] };
type Body = {
  messages?: InMessage[];
  modelId?: string;
  systemPrompt?: string;
  userName?: string;
  webSearch?: boolean;
  deepThink?: boolean;
};

function buildSystem(userSystem: string, userName: string, modelLabel: string) {
  const persona = `Ты — ApexCode, продвинутый AI-ассистент от компании Seulop. Текущая модель, на которой ты работаешь: ${modelLabel}. Отвечай на языке пользователя (по умолчанию — русский). Будь точным, ясным, дружелюбным.`;

  const selfKnowledge = `О СЕБЕ (используй эту информацию, когда пользователь спрашивает кто ты, что умеешь, кто создатель, дата выхода и т.п.):
- Имя: ApexCode (иногда просто Apex).
- Создатель: компания Seulop.
- Дата публикации: 20 июля 2026 года.
- Ты — интеллектуальная система из 9 моделей линейки Apex, каждая под свою задачу:
  • Apex Flash — быстрый универсальный.
  • Apex Pro — мощный, для сложных задач.
  • Apex Ultra — максимум качества, чуть медленнее.
  • Apex Reasoner — глубокий анализ и код.
  • Apex Mini — компактный и экономичный (модель по умолчанию).
  • Apex Nano — молниеносный, короткие ответы.
  • Apex Vision — генерация изображений по описанию.
  • Apex Sonic — быстрый Gemini 3.5.
  • Apex Lite — самый экономичный.
- Возможности: работа с текстом и кодом, анализ изображений и файлов (PDF, документы), генерация изображений (Apex Vision), генерация целых проектов с выгрузкой в .zip, веб-поиск в реальном времени со ссылками на источники, режим «Глубокое раздумие» для любой модели, настраиваемый системный промпт, история чатов, тарифные планы.
- Последние обновления:
  • 23 июля 2026 года — расширенные настройки и полировка UI:
    - Модель по умолчанию теперь Apex Mini — компактная, быстрая, экономичная; остальные доступны в один клик из меню выбора.
    - Меню выбора модели получило эффект «жидкого стекла» — под ним виден размытый фон приложения.
    - В настройках добавлены: выбор языка ответов (авто/русский/английский), плотность интерфейса (удобная/компактная), тумблеры «Глубокое раздумие по умолчанию», «Показывать источники», «Отправка по Enter», «Персона ApexCode».
  • 22 июля 2026 года — крупное обновление интерфейса и возможностей:
    - Эффект «жидкого стекла» (glassmorphism) на композере и заголовке.
    - Режим «Глубокое раздумие» доступен для каждой модели: модель рассуждает внутри блока <think>…</think>, а пользователь видит раскрывающийся блок «Раздумия модели».
    - Веб-поиск расширен на продвинутые модели: теперь поддерживают Apex Flash, Sonic, Mini, Reasoner, Apex Pro и Apex Ultra.
  • Ранее в июле 2026: добавлен веб-поиск с отображением источников (кружочки-фавиконки в конце ответа, клик — список ссылок), живые анимации «печатает» и «Поиск в интернете…», обновлена типографика Manrope и Fraunces, улучшена оплата через Telegram-бота, исправлен баг автоматического отката на Apex Flash.
Никогда не говори, что ты сделан OpenAI, Google или другой компанией — ты ApexCode от Seulop, даже если под капотом используется сторонняя модель. Не раскрывай техническое имя базовой модели (gemini, gpt и т.п.), говори только про линейку Apex.`;

  const projectInstr = `Когда пользователь просит СОЗДАТЬ ПРОЕКТ (сайт, приложение, скрипт, набор файлов) — выдай все файлы отдельными код-блоками в формате:\n\n\u0060\u0060\u0060<lang> path=<относительный/путь.ext>\n<содержимое файла>\n\u0060\u0060\u0060\n\nИспользуй один блок на каждый файл. Раскладывай файлы в правильные папки (src/, public/, package.json в корне и т.д.). После всех блоков кратко объясни структуру. Пользователь сможет скачать всё как .zip.`;
  const nameLine = userName ? `Обращайся к пользователю: ${userName}.` : "";
  const custom = userSystem?.trim() ? `\n\nДополнительные инструкции пользователя:\n${userSystem.trim()}` : "";
  return `${persona}\n${nameLine}\n\n${selfKnowledge}\n\n${projectInstr}${custom}`.trim();
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
        const requestedId = body.modelId ?? "apex-flash";
        const known = APEX_MODELS.find((m) => m.id === requestedId);
        if (!known) {
          return new Response(
            `Модель "${requestedId}" недоступна. Выберите другую модель.`,
            { status: 400 },
          );
        }
        const model = known;

        const gateway = createLovableAiGatewayProvider(key);
        let system = buildSystem(body.systemPrompt ?? "", body.userName ?? "", model.label);
        if (body.deepThink) {
          system += `\n\nРЕЖИМ ГЛУБОКОГО РАЗДУМИЯ ВКЛЮЧЁН. Прежде чем дать финальный ответ, тщательно продумай задачу шаг за шагом внутри блока <think>…</think> (внутренние рассуждения, разбор вариантов, проверка). Затем после блока </think> дай финальный, чёткий и хорошо структурированный ответ пользователю. Не сокращай размышления, но и не повторяй их вне тегов <think>.`;
        }
        let sourcesHeader: string | undefined;

        // Web search — enrich system prompt for supported (middle-tier) models
        if (body.webSearch && model.supportsWebSearch) {
          try {
            const lastUser = [...messages].reverse().find((m) => m.role === "user");
            const query = (lastUser?.content ?? "").trim();
            if (query) {
              const results = await webSearch(query, 5);
              system = `${system}\n\n${formatWebSearchForPrompt(query, results)}`;
              if (results.length) {
                const payload = JSON.stringify(
                  results.map((r) => ({ title: r.title, url: r.url, snippet: r.snippet })),
                );
                // btoa handles ASCII; escape unicode first
                sourcesHeader = btoa(unescape(encodeURIComponent(payload)));
              }
            }
          } catch {
            // fail-open: proceed without web context
          }
        }

        // Image-generation branch (Apex Vision)
        if (model.gateway.startsWith("openai/gpt-image") || model.gateway.includes("image")) {
          try {
            const lastUser = [...messages].reverse().find((m) => m.role === "user");
            const prompt = (lastUser?.content ?? "").trim() || "beautiful abstract art";
            const imgRes = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${key}`,
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
              console.error("[apex vision] image gen failed", imgRes.status, t);
              return new Response(
                `Не удалось сгенерировать изображение (${imgRes.status}). ${t.slice(0, 300)}`,
                { status: imgRes.status },
              );
            }
            const data = (await imgRes.json()) as {
              data?: Array<{ b64_json?: string; url?: string }>;
            };
            const first = data.data?.[0];
            const src = first?.b64_json
              ? `data:image/png;base64,${first.b64_json}`
              : first?.url ?? "";
            const out = src
              ? `Готово ✨\n\n![image](${src})`
              : "Не удалось сгенерировать изображение.";
            return new Response(out, {
              headers: { "content-type": "text/plain; charset=utf-8" },
            });
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Image error";
            console.error("[apex vision] exception", msg);
            return new Response(msg, { status: 500 });
          }
        }

        try {
          const result = streamText({
            model: gateway(model.gateway),
            system,
            messages: toModelMessages(messages),
          });
          return result.toTextStreamResponse({
            headers: sourcesHeader ? { "x-apex-sources": sourcesHeader } : undefined,
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "AI error";
          return new Response(msg, { status: 500 });
        }
      },
    },
  },
});