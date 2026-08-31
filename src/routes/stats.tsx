import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Coins,
  Globe,
  Brain,
  KeyRound,
  Sparkles,
} from "lucide-react";

type KeyInfo = {
  planId: string;
  planLabel: string;
  label: string;
  requestsUsed: number;
  tokensUsed: number;
  createdAt: string;
  sessionCap: number;
};

type Stats = {
  days: number;
  scope: "key" | "all";
  keyInfo: KeyInfo | null;
  totals: {
    requests: number;
    ok: number;
    errors: number;
    tokens: number;
    avgDurationMs: number;
    successRate: number;
    webSearch: number;
    deepThink: number;
  };
  byModel: Array<{ modelId: string; requests: number; errors: number; tokens: number }>;
  bySource: Array<{ source: string; requests: number; errors: number }>;
  daily: Array<{ day: string; requests: number; errors: number; tokens: number }>;
  recent: Array<{
    id: string;
    source: string;
    model_id: string;
    status: string;
    error_message: string | null;
    status_code: number | null;
    tokens: number;
    duration_ms: number;
    web_search: boolean;
    deep_think: boolean;
    created_at: string;
  }>;
};

export const Route = createFileRoute("/stats")({
  component: StatsPage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Статистика ApexCode — использование и ошибки" },
      {
        name: "description",
        content:
          "Панель статистики ApexCode: количество запросов, успешные и ошибочные ответы, токены, модели и источники.",
      },
      { property: "og:title", content: "Статистика ApexCode" },
      {
        property: "og:description",
        content: "Использование моделей Apex, успешность ответов и расход токенов.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Card({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="apex-glass rounded-2xl p-4 border border-border/50">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

function StatsPage() {
  const [days, setDays] = useState(14);
  const [apiKey, setApiKey] = useState("");
  const [scope, setScope] = useState<"key" | "all">("all");

  useEffect(() => {
    try {
      const k = localStorage.getItem("apexcode:apikey") ?? "";
      if (k) {
        setApiKey(k);
        setScope("key");
      }
    } catch {
      /* ignore */
    }
  }, []);

  const keyParam = scope === "key" && apiKey ? `&key=${encodeURIComponent(apiKey)}` : "";
  const { data, isLoading, error } = useQuery<Stats>({
    queryKey: ["stats", days, keyParam],
    queryFn: async () => {
      const r = await fetch(`/api/stats?days=${days}${keyParam}`);
      if (!r.ok) throw new Error(await r.text());
      return (await r.json()) as Stats;
    },
    refetchInterval: 30_000,
  });

  const maxDaily = Math.max(1, ...(data?.daily ?? []).map((d) => d.requests));

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="apex-glass sticky top-0 z-10 border-b border-border/50 px-4 py-3 flex items-center gap-3">
        <Link to="/" className="h-9 w-9 rounded-full hover:bg-accent flex items-center justify-center">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-serif text-lg leading-none">Статистика</h1>
          <div className="text-[11px] text-muted-foreground">использование и ответы</div>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="ml-auto bg-secondary text-sm rounded-lg px-2 py-1.5 border border-border"
        >
          <option value={1}>24 часа</option>
          <option value={7}>7 дней</option>
          <option value={14}>14 дней</option>
          <option value={30}>30 дней</option>
        </select>
      </header>

      <main className="p-4 space-y-5 max-w-4xl mx-auto pb-16">
        {isLoading && <div className="text-muted-foreground text-sm">Загрузка…</div>}
        {error && (
          <div className="text-destructive text-sm">
            Не удалось загрузить статистику: {(error as Error).message}
          </div>
        )}

        {apiKey && (
          <div className="flex gap-2">
            <button
              onClick={() => setScope("key")}
              className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium border transition ${scope === "key" ? "apex-holo text-foreground" : "apex-glass border-border/50 text-muted-foreground"}`}
            >
              Мой API-ключ
            </button>
            <button
              onClick={() => setScope("all")}
              className={`flex-1 rounded-xl px-3 py-2 text-xs font-medium border transition ${scope === "all" ? "apex-holo text-foreground" : "apex-glass border-border/50 text-muted-foreground"}`}
            >
              Всё использование
            </button>
          </div>
        )}

        {data?.keyInfo && (
          <section className="apex-holo p-5">
            <div className="relative z-10 flex items-start gap-4">
              <div className="relative h-14 w-14 shrink-0">
                <div className="apex-holo-ring absolute inset-0 rounded-full opacity-80 blur-[1px]" />
                <div className="absolute inset-[3px] rounded-full bg-background/80 flex items-center justify-center">
                  <KeyRound className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  <Sparkles className="h-3 w-3" /> API-ключ
                </div>
                <div className="font-serif text-xl apex-holo-text leading-tight">
                  {data.keyInfo.planLabel}
                </div>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground break-all">
                  {apiKey.slice(0, 12)}••••{apiKey.slice(-4)}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="text-muted-foreground">Запросов</div>
                    <div className="text-base font-semibold">{data.keyInfo.requestsUsed.toLocaleString("ru-RU")}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Токенов</div>
                    <div className="text-base font-semibold">{data.keyInfo.tokensUsed.toLocaleString("ru-RU")}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Лимит/запрос</div>
                    <div className="text-base font-semibold">{data.keyInfo.sessionCap.toLocaleString("ru-RU")}</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {data && data.scope === "key" && data.totals.requests === 0 && (
          <div className="text-sm text-muted-foreground">
            По этому ключу пока нет запросов — отправьте первый запрос к /api/public/v1/chat/completions.
          </div>
        )}

        {data && (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card icon={<Activity className="h-3.5 w-3.5" />} label="Запросы" value={String(data.totals.requests)} />
              <Card
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                label="Успешно"
                value={`${data.totals.successRate}%`}
                hint={`${data.totals.ok} ответов`}
              />
              <Card
                icon={<AlertTriangle className="h-3.5 w-3.5" />}
                label="Ошибки"
                value={String(data.totals.errors)}
              />
              <Card
                icon={<Coins className="h-3.5 w-3.5" />}
                label="Токены"
                value={data.totals.tokens.toLocaleString("ru-RU")}
              />
              <Card
                icon={<Clock className="h-3.5 w-3.5" />}
                label="Ср. время"
                value={`${(data.totals.avgDurationMs / 1000).toFixed(1)} с`}
              />
              <Card icon={<Globe className="h-3.5 w-3.5" />} label="Веб-поиск" value={String(data.totals.webSearch)} />
              <Card icon={<Brain className="h-3.5 w-3.5" />} label="Раздумие" value={String(data.totals.deepThink)} />
              <Card
                icon={<Activity className="h-3.5 w-3.5" />}
                label="Источники"
                value={data.bySource.map((s) => `${s.source}: ${s.requests}`).join(" · ") || "—"}
              />
            </section>

            <section className="apex-glass rounded-2xl p-4 border border-border/50">
              <h2 className="text-sm font-medium mb-3">Запросы по дням</h2>
              <div className="flex items-end gap-1 h-32">
                {data.daily.length === 0 && (
                  <div className="text-sm text-muted-foreground">Пока нет данных</div>
                )}
                {data.daily.map((d) => (
                  <div key={d.day} className="flex-1 flex flex-col justify-end items-center gap-1" title={`${d.day}: ${d.requests} запросов, ${d.errors} ошибок`}>
                    <div className="w-full rounded-t bg-primary/70" style={{ height: `${(d.requests / maxDaily) * 100}%` }} />
                    {d.errors > 0 && (
                      <div className="w-full rounded-b bg-destructive/70" style={{ height: `${(d.errors / maxDaily) * 100}%` }} />
                    )}
                    <span className="text-[9px] text-muted-foreground">{d.day.slice(5)}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="apex-glass rounded-2xl p-4 border border-border/50">
              <h2 className="text-sm font-medium mb-3">По моделям</h2>
              <div className="space-y-2">
                {data.byModel.length === 0 && <div className="text-sm text-muted-foreground">Пока нет данных</div>}
                {data.byModel.map((m) => (
                  <div key={m.modelId} className="text-sm">
                    <div className="flex justify-between">
                      <span>{m.modelId}</span>
                      <span className="text-muted-foreground">
                        {m.requests} · {m.errors} ош. · {m.tokens.toLocaleString("ru-RU")} т.
                      </span>
                    </div>
                    <div className="h-1.5 mt-1 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${(m.requests / data.totals.requests) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="apex-glass rounded-2xl p-4 border border-border/50">
              <h2 className="text-sm font-medium mb-3">Последние ответы</h2>
              <div className="space-y-2">
                {data.recent.length === 0 && <div className="text-sm text-muted-foreground">Пока нет данных</div>}
                {data.recent.map((r) => (
                  <div key={r.id} className="flex items-start gap-2 text-xs border-b border-border/40 pb-2">
                    <span
                      className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${r.status === "ok" ? "bg-emerald-500" : "bg-destructive"}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-x-2 text-muted-foreground">
                        <span className="text-foreground">{r.model_id}</span>
                        <span>{r.source}</span>
                        <span>{(r.duration_ms / 1000).toFixed(1)} с</span>
                        <span>{r.tokens} т.</span>
                        {r.web_search && <span>веб</span>}
                        {r.deep_think && <span>раздумие</span>}
                        <span className="ml-auto">
                          {new Date(r.created_at).toLocaleString("ru-RU")}
                        </span>
                      </div>
                      {r.error_message && (
                        <div className="text-destructive mt-0.5 break-words">
                          {r.status_code ? `${r.status_code}: ` : ""}
                          {r.error_message}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
