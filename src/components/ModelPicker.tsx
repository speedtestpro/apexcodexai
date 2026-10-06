import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, Sparkles, Lock, Eye, Globe, Paperclip, Search } from "lucide-react";
import { APEX_MODELS, getModel } from "@/lib/models";

export default function ModelPicker({
  current,
  onChange,
  allowedIds,
  autoMode,
  onLockedPick,
}: {
  current: string;
  onChange: (id: string) => void;
  allowedIds: string[];
  autoMode?: boolean;
  onLockedPick?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  useEffect(() => { if (!open) setQ(""); }, [open]);

  const cur = getModel(current);
  const term = q.trim().toLowerCase();
  const list = APEX_MODELS.filter((m) => !m.apiOnly).filter(
    (m) => !term || m.label.toLowerCase().includes(term) || m.description.toLowerCase().includes(term),
  );
  const available = list.filter((m) => allowedIds.includes(m.id));
  const locked = list.filter((m) => !allowedIds.includes(m.id));

  if (autoMode) {
    return (
      <button
        onClick={() => onLockedPick?.(current)}
        className="flex items-center gap-1.5 rounded-full bg-secondary hover:bg-accent px-3.5 py-2 text-sm font-medium transition"
      >
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] uppercase tracking-widest text-primary/90">Авто</span>
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full bg-secondary hover:bg-accent px-3.5 py-2 text-sm font-medium transition"
      >
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="font-serif text-[15px]">{cur.label}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-background/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div className="apex-glass fixed left-1/2 -translate-x-1/2 top-14 w-[min(380px,94vw)] max-h-[min(74vh,620px)] flex flex-col rounded-3xl shadow-2xl z-50 overflow-hidden">
            <div className="p-3 pb-2 border-b border-border/50">
              <div className="flex items-center gap-2 rounded-full bg-secondary/70 px-3 py-2">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Поиск модели"
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="overflow-y-auto overscroll-contain p-2" style={{ WebkitOverflowScrolling: "touch" }}>
              {available.length > 0 && (
                <div className="px-2 pt-1 pb-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">Доступно</div>
              )}
              {available.map((m) => (
                <Row key={m.id} m={m} current={current} onPick={() => { setOpen(false); onChange(m.id); }} />
              ))}

              {locked.length > 0 && (
                <div className="px-2 pt-3 pb-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">Платные тарифы</div>
              )}
              {locked.map((m) => (
                <Row key={m.id} m={m} current={current} locked onPick={() => { setOpen(false); onLockedPick?.(m.id); }} />
              ))}

              {list.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">Ничего не найдено</div>
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-border/50 text-[10px] text-muted-foreground">
              {autoMode
                ? "Модель выбирается автоматически. Ручной выбор — с тарифа Pro."
                : "Смена модели создаёт новый чат."}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Cap({ icon: Icon, label }: { icon: typeof Eye; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

function Row({
  m, current, locked, onPick,
}: {
  m: (typeof APEX_MODELS)[number];
  current: string;
  locked?: boolean;
  onPick: () => void;
}) {
  const active = m.id === current && !locked;
  return (
    <button
      onClick={onPick}
      className={`w-full flex items-start gap-3 px-3 py-3 rounded-2xl text-left transition ${
        active ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-accent"
      } ${locked ? "opacity-70" : ""}`}
    >
      <div className={`h-8 w-8 shrink-0 rounded-xl flex items-center justify-center ${active ? "apex-orb" : "bg-secondary"}`}>
        {locked ? <Lock className="h-4 w-4 text-muted-foreground" /> : <Sparkles className="h-4 w-4 text-primary" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-serif text-[15px]">{m.label}</span>
          {m.badge && (
            <span className="text-[9px] uppercase tracking-widest text-primary/80 border border-primary/40 rounded-full px-1.5 py-0.5">{m.badge}</span>
          )}
          {m.version && (
            <span className="text-[9px] tracking-wide text-muted-foreground border border-border rounded-full px-1.5 py-0.5">v{m.version}</span>
          )}

          {active && <Check className="h-4 w-4 text-primary ml-auto" />}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">{m.description}</div>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {m.supportsVision && <Cap icon={Eye} label="Смотрит фото" />}
          {m.supportsWebSearch && <Cap icon={Globe} label="Веб-поиск" />}
          {m.supportsFiles && <Cap icon={Paperclip} label="Файлы" />}
        </div>
      </div>
    </button>
  );
}
