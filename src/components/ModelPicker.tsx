import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, Sparkles, Lock } from "lucide-react";
import { APEX_MODELS, getModel } from "@/lib/models";

export default function ModelPicker({
  current,
  onChange,
  allowedIds,
  onLockedPick,
}: {
  current: string;
  onChange: (id: string) => void;
  allowedIds: string[];
  onLockedPick?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const cur = getModel(current);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full bg-secondary hover:bg-accent px-3.5 py-2 text-sm font-medium transition"
      >
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="font-serif text-[15px]">{cur.label}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-[280px] max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-popover shadow-xl z-30 p-1">
          {APEX_MODELS.map((m) => {
            const locked = !allowedIds.includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() => {
                  setOpen(false);
                  if (locked) onLockedPick?.(m.id);
                  else onChange(m.id);
                }}
                className={`w-full flex items-start gap-2 px-3 py-2.5 rounded-xl text-left transition ${m.id === current ? "bg-accent/60" : "hover:bg-accent"} ${locked ? "opacity-60" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-[15px]">{m.label}</span>
                    {m.badge && (
                      <span className="text-[9px] uppercase tracking-widest text-primary/80 border border-primary/40 rounded-full px-1.5 py-0.5">{m.badge}</span>
                    )}
                    {locked && (
                      <span className="ml-auto flex items-center gap-1 text-[10px] uppercase tracking-widest text-muted-foreground border border-border rounded-full px-1.5 py-0.5">
                        <Lock className="h-3 w-3" /> Pro
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{m.description}</div>
                </div>
                {m.id === current && !locked && <Check className="h-4 w-4 text-primary mt-1" />}
              </button>
            );
          })}
          <div className="px-3 py-2 text-[10px] text-muted-foreground">Смена модели создаёт новый чат. Заблокированные модели — на платных тарифах.</div>
        </div>
      )}
    </div>
  );
}