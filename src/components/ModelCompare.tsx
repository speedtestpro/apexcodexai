type Row = {
  apex: string;
  tagline: string;
  gpt: string;
  gemini: string;
  claude: string;
  strength: string;
};

const ROWS: Row[] = [
  {
    apex: "Apex Quasar",
    tagline: "Флагман нового поколения",
    gpt: "GPT-5.5 / o-series",
    gemini: "Gemini 3.1 Pro",
    claude: "Claude Opus 4.5",
    strength: "Сложный код, длинные цепочки рассуждений, агентные задачи",
  },
  {
    apex: "Apex Ultra",
    tagline: "Максимум качества",
    gpt: "GPT-5.5",
    gemini: "Gemini 3.1 Pro",
    claude: "Claude Opus 4.1",
    strength: "Глубокий анализ, архитектура, исследовательские задачи",
  },
  {
    apex: "Apex Pro",
    tagline: "Мощный универсал",
    gpt: "GPT-5",
    gemini: "Gemini 2.5 Pro",
    claude: "Claude Sonnet 4.5",
    strength: "Баланс качества и скорости для повседневной работы",
  },
  {
    apex: "Apex Reasoner",
    tagline: "Рассуждения и код",
    gpt: "GPT-5.4",
    gemini: "Gemini 3.5 Flash Thinking",
    claude: "Claude Sonnet 4.5 (thinking)",
    strength: "Пошаговая логика, отладка, математика",
  },
  {
    apex: "Apex Flash",
    tagline: "Быстрый универсальный",
    gpt: "GPT-5.4 mini",
    gemini: "Gemini 3 Flash",
    claude: "Claude Haiku 4.5",
    strength: "Быстрые ответы с веб-поиском",
  },
  {
    apex: "Apex Sonic",
    tagline: "Скорость Gemini",
    gpt: "GPT-5 mini",
    gemini: "Gemini 3.5 Flash",
    claude: "Claude Haiku 4.5",
    strength: "Диалоги в реальном времени, суммаризация",
  },
  {
    apex: "Apex Mini",
    tagline: "Компактный",
    gpt: "GPT-5 mini",
    gemini: "Gemini 2.5 Flash",
    claude: "Claude Haiku 3.5",
    strength: "Дешёвые массовые запросы",
  },
  {
    apex: "Apex Nano",
    tagline: "Молниеносный",
    gpt: "GPT-5 nano",
    gemini: "Gemini 2.5 Flash-Lite",
    claude: "Claude Haiku 3",
    strength: "Классификация, короткие ответы",
  },
  {
    apex: "Apex Lite",
    tagline: "Самый экономичный",
    gpt: "GPT-5 nano",
    gemini: "Gemini 3.1 Flash-Lite",
    claude: "Claude Haiku 3",
    strength: "Извлечение данных, теги, высокая нагрузка",
  },
];

export default function ModelCompare() {
  return (
    <div className="p-4 space-y-4">
      <div>
        <div className="font-serif text-lg">Сравнение моделей</div>
        <p className="text-xs text-muted-foreground mt-1">
          Приблизительные аналоги моделей Apex среди GPT, Gemini и Claude — по уровню качества и скорости.
        </p>
      </div>

      <div className="hidden sm:block overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="text-left font-medium p-2.5">Apex</th>
              <th className="text-left font-medium p-2.5">GPT</th>
              <th className="text-left font-medium p-2.5">Gemini</th>
              <th className="text-left font-medium p-2.5">Claude</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.apex} className="border-t border-border align-top">
                <td className="p-2.5">
                  <div className="font-medium text-foreground">{r.apex}</div>
                  <div className="text-[11px] text-muted-foreground">{r.tagline}</div>
                </td>
                <td className="p-2.5 text-muted-foreground">{r.gpt}</td>
                <td className="p-2.5 text-muted-foreground">{r.gemini}</td>
                <td className="p-2.5 text-muted-foreground">{r.claude}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sm:hidden space-y-2">
        {ROWS.map((r) => (
          <div key={r.apex} className="rounded-xl border border-border p-3 space-y-2">
            <div>
              <div className="text-sm font-medium">{r.apex}</div>
              <div className="text-[11px] text-muted-foreground">{r.tagline}</div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              {([
                { l: "GPT", v: r.gpt },
                { l: "Gemini", v: r.gemini },
                { l: "Claude", v: r.claude },
              ] as const).map((c) => (
                <div key={c.l} className="rounded-lg bg-muted/40 p-2">
                  <div className="text-muted-foreground">{c.l}</div>
                  <div className="text-foreground mt-0.5 leading-tight">{c.v}</div>
                </div>
              ))}
            </div>
            <div className="text-[11px] text-muted-foreground">{r.strength}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border p-3 bg-muted/40 text-[11px] text-muted-foreground">
        Сравнение ориентировочное: оно отражает класс задач, а не точные бенчмарки. Названия GPT, Gemini и Claude
        принадлежат их владельцам.
      </div>
    </div>
  );
}
