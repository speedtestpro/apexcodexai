import { useMemo, useState } from "react";
import { Check, Copy, Search } from "lucide-react";
import { APEX_MODELS } from "@/lib/models";
import { PLANS } from "@/lib/plans";

function CodeSample({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <pre className="bg-muted/60 border border-border rounded-lg p-2.5 pr-10 text-[11px] overflow-x-auto">
        <code>{code}</code>
      </pre>
      {lang && (
        <span className="absolute left-2.5 -top-2 text-[9px] uppercase tracking-wide bg-card border border-border rounded px-1.5 py-0.5 text-muted-foreground">
          {lang}
        </span>
      )}
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {}
        }}
        className="absolute top-2 right-2 h-7 w-7 rounded-md border border-border bg-card/80 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label="Скопировать"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-2 scroll-mt-4">
      <div className="font-medium">{title}</div>
      {children}
    </section>
  );
}

const NAV = [
  { id: "start", label: "Быстрый старт" },
  { id: "auth", label: "Аутентификация" },
  { id: "models", label: "Модели" },
  { id: "plans", label: "Тарифы и лимиты" },
  { id: "chat", label: "Chat Completions" },
  { id: "stream", label: "Стриминг" },
  { id: "vision", label: "Изображения" },
  { id: "imagegen", label: "Генерация фото" },
  { id: "sdk", label: "SDK и примеры" },
  { id: "errors", label: "Ошибки" },
  { id: "faq", label: "FAQ" },
];

export default function ApiDocs({ baseUrl }: { baseUrl: string }) {
  const [q, setQ] = useState("");
  const models = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return APEX_MODELS;
    return APEX_MODELS.filter((m) => m.id.includes(s) || m.label.toLowerCase().includes(s));
  }, [q]);

  return (
    <div className="p-4 space-y-5 text-sm">
      <div>
        <div className="font-serif text-lg">ApexCode API</div>
        <p className="text-xs text-muted-foreground mt-1">
          OpenAI-совместимый REST API от Seulop. Один ключ, десять моделей Apex, стриминг, зрение и генерация
          изображений. Доступ к моделям определяется вашим тарифом.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {NAV.map((n) => (
          <a
            key={n.id}
            href={`#${n.id}`}
            className="text-[11px] rounded-full border border-border px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-accent transition"
          >
            {n.label}
          </a>
        ))}
      </div>

      <Section id="start" title="1. Быстрый старт">
        <ol className="text-xs text-muted-foreground list-decimal pl-4 space-y-1">
          <li>Оформите тариф во вкладке «Тарифы».</li>
          <li>Во вкладке «API» нажмите «Получить API-ключ» — ключ вида <code className="text-foreground">apex_sk_…</code>.</li>
          <li>Отправьте первый запрос:</li>
        </ol>
        <CodeSample
          lang="bash"
          code={`curl ${baseUrl}/chat/completions \\
  -H "Authorization: Bearer $APEX_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"apex-flash","messages":[{"role":"user","content":"Привет!"}]}'`}
        />
        <div className="rounded-lg border border-border bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
          Базовый URL: <code className="text-foreground">{baseUrl}</code>
        </div>
      </Section>

      <Section id="auth" title="2. Аутентификация">
        <p className="text-xs text-muted-foreground">
          Ключ передаётся в заголовке <code className="text-foreground">Authorization</code> либо в{" "}
          <code className="text-foreground">x-api-key</code>. Ключ привязан к тарифу: пересоздайте его после покупки
          нового тарифа. Никогда не используйте ключ в браузерном коде — только на сервере.
        </p>
        <CodeSample lang="http" code={`Authorization: Bearer apex_sk_...\n# или\nx-api-key: apex_sk_...`} />
      </Section>

      <Section id="models" title="3. Модели">
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск модели…"
            className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-xs outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-[11px]">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="text-left p-2 font-medium">ID</th>
                <th className="text-left p-2 font-medium">Назначение</th>
                <th className="p-2 font-medium">Vision</th>
                <th className="p-2 font-medium">Web</th>
                <th className="p-2 font-medium">v</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.id} className="border-t border-border align-top">
                  <td className="p-2 font-mono text-foreground whitespace-nowrap">{m.id}</td>
                  <td className="p-2 text-muted-foreground">{m.description}</td>
                  <td className="p-2 text-center">{m.supportsVision ? "✓" : "—"}</td>
                  <td className="p-2 text-center">{m.supportsWebSearch ? "✓" : "—"}</td>
                  <td className="p-2 text-center text-muted-foreground">{m.version ?? "2.0"}</td>
                </tr>
              ))}
              {models.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-3 text-center text-muted-foreground">
                    Ничего не найдено
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Список доступных именно вам моделей: <code className="text-foreground">GET {baseUrl}/models</code>
        </p>
        <CodeSample lang="bash" code={`curl ${baseUrl}/models -H "Authorization: Bearer $APEX_API_KEY"`} />
      </Section>

      <Section id="plans" title="4. Тарифы и лимиты">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-[11px]">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="text-left p-2 font-medium">Тариф</th>
                <th className="text-left p-2 font-medium">Цена</th>
                <th className="text-left p-2 font-medium">Токенов/запрос</th>
                <th className="text-left p-2 font-medium">Моделей</th>
              </tr>
            </thead>
            <tbody>
              {PLANS.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-2 text-foreground">{p.label}</td>
                  <td className="p-2 text-muted-foreground">{p.price}</td>
                  <td className="p-2 text-muted-foreground">{p.sessionCap.toLocaleString("ru-RU")}</td>
                  <td className="p-2 text-muted-foreground">{p.models.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Запрос больше лимита тарифа отклоняется с кодом <code className="text-foreground">413</code>. Модель вне
          тарифа — <code className="text-foreground">403</code>.
        </p>
      </Section>

      <Section id="chat" title="5. POST /chat/completions">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-[11px]">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="text-left p-2 font-medium">Поле</th>
                <th className="text-left p-2 font-medium">Тип</th>
                <th className="text-left p-2 font-medium">Описание</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["model", "string", "ID модели Apex. По умолчанию apex-flash."],
                ["messages", "array", "Обязательно. Роли: system, user, assistant."],
                ["stream", "boolean", "true — ответ в формате SSE."],
                ["temperature", "number", "0–2, креативность ответа."],
                ["max_tokens", "number", "Мягкий лимит длины ответа."],
              ].map(([f, t, d]) => (
                <tr key={f} className="border-t border-border align-top">
                  <td className="p-2 font-mono text-foreground">{f}</td>
                  <td className="p-2 text-muted-foreground">{t}</td>
                  <td className="p-2 text-muted-foreground">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <CodeSample
          lang="json"
          code={`{
  "model": "apex-pro",
  "messages": [
    {"role": "system", "content": "Отвечай кратко."},
    {"role": "user", "content": "Что такое REST?"}
  ],
  "temperature": 0.7,
  "stream": false
}`}
        />
        <div className="text-xs text-muted-foreground">Ответ:</div>
        <CodeSample
          lang="json"
          code={`{
  "id": "chatcmpl_ab12cd34",
  "object": "chat.completion",
  "created": 1750000000,
  "model": "apex-pro",
  "choices": [{
    "index": 0,
    "message": {"role": "assistant", "content": "REST — это…"},
    "finish_reason": "stop"
  }],
  "usage": {"prompt_tokens": 18, "completion_tokens": 42, "total_tokens": 60}
}`}
        />
      </Section>

      <Section id="stream" title="6. Стриминг (SSE)">
        <p className="text-xs text-muted-foreground">
          С <code className="text-foreground">"stream": true</code> сервер шлёт события{" "}
          <code className="text-foreground">data: {"{…}"}</code> и завершает поток строкой{" "}
          <code className="text-foreground">data: [DONE]</code>.
        </p>
        <CodeSample
          lang="js"
          code={`const res = await fetch("${baseUrl}/chat/completions", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.APEX_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "apex-flash",
    messages: [{ role: "user", content: "Расскажи о космосе" }],
    stream: true,
  }),
});

const reader = res.body.getReader();
const dec = new TextDecoder();
let buf = "";
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buf += dec.decode(value, { stream: true });
  for (const line of buf.split("\\n\\n")) {
    if (!line.startsWith("data: ")) continue;
    const payload = line.slice(6);
    if (payload === "[DONE]") break;
    const json = JSON.parse(payload);
    process.stdout.write(json.choices?.[0]?.delta?.content ?? "");
  }
  buf = buf.slice(buf.lastIndexOf("\\n\\n") + 2);
}`}
        />
      </Section>

      <Section id="vision" title="7. Изображения на вход (Vision)">
        <p className="text-xs text-muted-foreground">
          Поддерживают модели с отметкой Vision. Передайте массив частей контента с{" "}
          <code className="text-foreground">image_url</code> (URL или data:base64).
        </p>
        <CodeSample
          lang="json"
          code={`{
  "model": "apex-pro",
  "messages": [{
    "role": "user",
    "content": [
      {"type": "text", "text": "Что на фото?"},
      {"type": "image_url", "image_url": {"url": "data:image/png;base64,iVBORw0KG..."}}
    ]
  }]
}`}
        />
      </Section>

      <Section id="imagegen" title="8. Генерация изображений">
        <p className="text-xs text-muted-foreground">
          Модель <code className="text-foreground">apex-vision</code> возвращает картинку в виде markdown-ссылки с
          data-URL внутри <code className="text-foreground">message.content</code>.
        </p>
        <CodeSample
          lang="bash"
          code={`curl ${baseUrl}/chat/completions \\
  -H "Authorization: Bearer $APEX_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"apex-vision","messages":[{"role":"user","content":"неоновый город под дождём"}]}'`}
        />
      </Section>

      <Section id="sdk" title="9. SDK и примеры">
        <p className="text-xs text-muted-foreground">
          API совместим с клиентами OpenAI — достаточно подменить <code className="text-foreground">baseURL</code>.
        </p>
        <CodeSample
          lang="python"
          code={`from openai import OpenAI

client = OpenAI(api_key="apex_sk_...", base_url="${baseUrl}")

resp = client.chat.completions.create(
    model="apex-quasar",
    messages=[{"role": "user", "content": "Напиши функцию быстрой сортировки"}],
)
print(resp.choices[0].message.content)`}
        />
        <CodeSample
          lang="ts"
          code={`import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.APEX_API_KEY,
  baseURL: "${baseUrl}",
});

const r = await client.chat.completions.create({
  model: "apex-mini",
  messages: [{ role: "user", content: "Привет!" }],
});
console.log(r.choices[0].message.content);`}
        />
      </Section>

      <Section id="errors" title="10. Ошибки">
        <p className="text-xs text-muted-foreground">
          Ошибки приходят в формате{" "}
          <code className="text-foreground">{`{"error": {"type", "message", "code"}}`}</code>.
        </p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-[11px]">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="text-left p-2 font-medium">Код</th>
                <th className="text-left p-2 font-medium">type</th>
                <th className="text-left p-2 font-medium">Что делать</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["400", "invalid_request_error", "Проверьте JSON и поле messages."],
                ["401", "invalid_api_key", "Ключ отсутствует, неверен или отозван."],
                ["402", "insufficient_credits", "Закончились кредиты тарифа."],
                ["403", "model_not_in_plan", "Модель недоступна на вашем тарифе."],
                ["413", "context_too_large", "Запрос длиннее лимита тарифа — сократите контекст."],
                ["429", "rate_limit_exceeded", "Слишком часто — повторите с backoff."],
                ["5xx", "server_error", "Временная ошибка, повторите позже."],
              ].map(([c, t, d]) => (
                <tr key={c} className="border-t border-border align-top">
                  <td className="p-2 font-mono text-foreground">{c}</td>
                  <td className="p-2 font-mono text-muted-foreground">{t}</td>
                  <td className="p-2 text-muted-foreground">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <CodeSample
          lang="json"
          code={`{"error": {"type": "model_not_in_plan", "message": "Модель \\"apex-ultra\\" недоступна на тарифе Free.", "code": "model_not_in_plan"}}`}
        />
      </Section>

      <Section id="faq" title="11. FAQ">
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>
            <span className="text-foreground font-medium">Как обновить тариф ключа?</span> Купите тариф и нажмите
            «Пересоздать» во вкладке API — ключ сразу перейдёт на новый тариф.
          </p>
          <p>
            <span className="text-foreground font-medium">Где смотреть расход?</span> Страница «Статистика» — запросы,
            токены, ошибки и latency по вашему ключу.
          </p>
          <p>
            <span className="text-foreground font-medium">Есть ли CORS?</span> Да, запросы разрешены с любого источника,
            но храните ключ на сервере.
          </p>
          <p>
            <span className="text-foreground font-medium">Хранятся ли мои данные?</span> Тексты запросов не сохраняются
            — только метрики использования.
          </p>
        </div>
      </Section>

      <div className="rounded-xl border border-border p-3 bg-muted/40 text-[11px] text-muted-foreground">
        © Seulop · ApexCode API v1 · модели Apex 2.1
      </div>
    </div>
  );
}
