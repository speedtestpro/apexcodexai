import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Coins,
  Globe,
  Brain,
} from "lucide-react";

type Stats = {
  days: number;
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
  const { data, isLoading, error } = useQuery<Stats>({
    queryKey: ["stats", days],
    queryFn: async () => {
      const r = await fetch(`/api/stats?days=${days}`);
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
