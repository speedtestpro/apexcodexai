import { useEffect, useState } from "react";
import { X, Copy, RefreshCw, Check, KeyRound, BookOpen, Settings2 } from "lucide-react";
import type { Settings } from "@/lib/storage";

export default function SettingsDialog({ open, onClose, settings, onSave }: { open: boolean; onClose: () => void; settings: Settings; onSave: (s: Settings) => void }) {
  const [local, setLocal] = useState<Settings>(settings);
  const [tab, setTab] = useState<"settings" | "api" | "docs">("settings");
  const [apiKey, setApiKey] = useState<string>("");
  const [copied, setCopied] = useState(false);
  useEffect(() => { setLocal(settings); }, [settings, open]);
  useEffect(() => {
    if (!open) return;
    try {
      const k = localStorage.getItem("apexcode:apikey");
      if (k) setApiKey(k);
    } catch {}
  }, [open]);

  function generateKey() {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    const key = `apex_sk_${hex}`;
    try { localStorage.setItem("apexcode:apikey", key); } catch {}
    setApiKey(key);
    setCopied(false);
  }
  async function copyKey() {
    if (!apiKey) return;
    try { await navigator.clipboard.writeText(apiKey); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  }
  function revokeKey() {
    try { localStorage.removeItem("apexcode:apikey"); } catch {}
    setApiKey("");
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-card border border-border rounded-t-3xl sm:rounded-3xl max-h-[90dvh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
          <div>
            <div className="font-serif text-xl">Настройки</div>
            <div className="text-xs text-muted-foreground">Персонализация ApexCode</div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-full hover:bg-accent flex items-center justify-center" aria-label="Закрыть">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-4 pt-3">
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted/40 p-1 text-xs">
            {([
              { id: "settings", label: "Общие", icon: Settings2 },
              { id: "api", label: "API", icon: KeyRound },
              { id: "docs", label: "Документация", icon: BookOpen },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 transition ${tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {tab === "settings" && (
        <div className="p-4 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Как к вам обращаться</label>
            <input
              value={local.userName}
              onChange={(e) => setLocal({ ...local, userName: e.target.value })}
              placeholder="Например, Артём"
              className="w-full bg-input border border-border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Системный промпт</label>
            <p className="text-xs text-muted-foreground">Инструкции модели: тон, роль, стиль ответов.</p>
            <textarea
              value={local.systemPrompt}
              onChange={(e) => setLocal({ ...local, systemPrompt: e.target.value })}
              rows={5}
              placeholder="Например: отвечай кратко, добавляй примеры кода."
              className="w-full bg-input border border-border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring/40 resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Творческость: {local.temperature.toFixed(1)}</label>
            <input
              type="range" min={0} max={1} step={0.1}
              value={local.temperature}
              onChange={(e) => setLocal({ ...local, temperature: parseFloat(e.target.value) })}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground"><span>Точнее</span><span>Свободнее</span></div>
          </div>
          <div className="rounded-xl border border-border p-3 bg-muted/40">
            <div className="text-xs text-muted-foreground">
              ApexCode — продукт компании <span className="text-foreground font-medium">Seulop</span>.
              Лимиты: 900 000 токенов на чат, 8 000 токенов на сессию с восстановлением от 2 часов.
            </div>
          </div>
        </div>
        )}
        {tab === "api" && (
          <div className="p-4 space-y-4">
            <div>
              <div className="text-sm font-medium">Ваш API-ключ</div>
              <p className="text-xs text-muted-foreground mt-1">Используется для доступа к ApexCode API. Храните его в секрете — как пароль.</p>
            </div>
            {apiKey ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-input border border-border rounded-xl px-3 py-2.5 font-mono text-xs break-all">
                  {apiKey}
                </div>
                <div className="flex gap-2">
                  <button onClick={copyKey} className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-secondary hover:bg-accent py-2.5 text-sm">
                    {copied ? <><Check className="h-4 w-4" /> Скопировано</> : <><Copy className="h-4 w-4" /> Копировать</>}
                  </button>
                  <button onClick={generateKey} className="flex items-center justify-center gap-1.5 rounded-xl bg-secondary hover:bg-accent py-2.5 px-3 text-sm" title="Пересоздать">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button onClick={revokeKey} className="rounded-xl bg-destructive/15 text-destructive hover:bg-destructive/25 py-2.5 px-3 text-sm">
                    Отозвать
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">Ключ хранится локально в вашем браузере. Пересоздание немедленно отзывает предыдущий.</p>
              </div>
            ) : (
              <button onClick={generateKey} className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 text-sm font-medium hover:opacity-90">
                <KeyRound className="h-4 w-4" /> Получить API-ключ
              </button>
            )}
            <div className="rounded-xl border border-border p-3 bg-muted/40 text-xs text-muted-foreground space-y-1">
              <div><span className="text-foreground font-medium">Тариф:</span> Free — 8 000 токенов на сессию, восстановление от 2 часов.</div>
              <div><span className="text-foreground font-medium">Лимит чата:</span> 900 000 токенов.</div>
              <div><span className="text-foreground font-medium">Провайдер:</span> Seulop · ApexCode.</div>
            </div>
          </div>
        )}
        {tab === "docs" && (
          <div className="p-4 space-y-4 text-sm">
            <div>
              <div className="font-serif text-lg">ApexCode API</div>
              <p className="text-xs text-muted-foreground mt-1">REST-совместимый интерфейс для чат-моделей Apex. Совместим с форматом OpenAI Chat Completions.</p>
            </div>

            <section className="space-y-1.5">
              <div className="font-medium">Базовый URL</div>
              <pre className="bg-muted/60 border border-border rounded-lg p-2.5 text-xs overflow-x-auto"><code>https://api.apexcode.seulop.ai/v1</code></pre>
            </section>

            <section className="space-y-1.5">
              <div className="font-medium">Аутентификация</div>
              <p className="text-xs text-muted-foreground">Передавайте ключ в заголовке <code className="text-foreground">Authorization</code>.</p>
              <pre className="bg-muted/60 border border-border rounded-lg p-2.5 text-xs overflow-x-auto"><code>{`Authorization: Bearer apex_sk_...`}</code></pre>
            </section>

            <section className="space-y-1.5">
              <div className="font-medium">Модели</div>
              <ul className="text-xs text-muted-foreground grid grid-cols-2 gap-x-3 gap-y-1 font-mono">
                <li>apex-pro</li><li>apex-flash</li>
                <li>apex-mini</li><li>apex-nano</li>
                <li>apex-vision</li><li>apex-lite</li>
                <li>apex-reasoner</li><li>apex-ultra</li>
                <li>apex-sonic</li>
              </ul>
            </section>

            <section className="space-y-1.5">
              <div className="font-medium">POST /chat/completions</div>
              <pre className="bg-muted/60 border border-border rounded-lg p-2.5 text-[11px] overflow-x-auto"><code>{`curl https://api.apexcode.seulop.ai/v1/chat/completions \\
  -H "Authorization: Bearer apex_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "apex-flash",
    "messages": [
      {"role": "user", "content": "Привет!"}
    ],
    "temperature": 0.7,
    "stream": false
  }'`}</code></pre>
            </section>

            <section className="space-y-1.5">
              <div className="font-medium">Ответ</div>
              <pre className="bg-muted/60 border border-border rounded-lg p-2.5 text-[11px] overflow-x-auto"><code>{`{
  "id": "cmpl_...",
  "model": "apex-flash",
  "choices": [{
    "index": 0,
    "message": {"role": "assistant", "content": "Привет!"},
    "finish_reason": "stop"
  }],
  "usage": {"prompt_tokens": 8, "completion_tokens": 3, "total_tokens": 11}
}`}</code></pre>
            </section>

            <section className="space-y-1.5">
              <div className="font-medium">Стриминг</div>
              <p className="text-xs text-muted-foreground">Добавьте <code className="text-foreground">"stream": true</code> — ответы придут как Server-Sent Events (<code>data: {`{...}`}</code>).</p>
            </section>

            <section className="space-y-1.5">
              <div className="font-medium">Файлы и изображения</div>
              <pre className="bg-muted/60 border border-border rounded-lg p-2.5 text-[11px] overflow-x-auto"><code>{`{
  "role": "user",
  "content": [
    {"type": "text", "text": "Что на фото?"},
    {"type": "image_url", "image_url": {"url": "data:image/png;base64,..."}}
  ]
}`}</code></pre>
            </section>

            <section className="space-y-1.5">
              <div className="font-medium">Ошибки</div>
              <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                <li><code>401</code> — неверный или отозванный ключ</li>
                <li><code>429</code> — сессионный лимит (8 000 токенов), ждите восстановления</li>
                <li><code>413</code> — превышен лимит чата (900 000 токенов)</li>
                <li><code>5xx</code> — временная ошибка, повторите позже</li>
              </ul>
            </section>

            <div className="rounded-xl border border-border p-3 bg-muted/40 text-[11px] text-muted-foreground">
              © Seulop · ApexCode API v1
            </div>
          </div>
        )}
        <div className="p-4 border-t border-border flex gap-2 sticky bottom-0 bg-card">
          <button onClick={onClose} className="flex-1 rounded-xl bg-secondary hover:bg-accent py-2.5 text-sm">Отмена</button>
          <button
            onClick={() => { onSave(local); onClose(); }}
            className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:opacity-90"
          >Сохранить</button>
        </div>
      </div>
    </div>
  );
}