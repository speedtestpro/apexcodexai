import { X, Plus, Trash2, Settings as SettingsIcon, Sparkles, Crown } from "lucide-react";
import type { Thread } from "@/lib/storage";
import { getPlan, type PlanId } from "@/lib/plans";

type Props = {
  open: boolean;
  onClose: () => void;
  threads: Thread[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onOpenSettings: () => void;
  onOpenPlans: () => void;
  currentPlan: PlanId;
};

export default function Sidebar({ open, onClose, threads, activeId, onSelect, onNew, onDelete, onOpenSettings, onOpenPlans, currentPlan }: Props) {
  const plan = getPlan(currentPlan);
  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} aria-hidden />
      )}
      <aside
        className={`fixed z-50 top-0 left-0 h-dvh w-[85%] max-w-[320px] bg-sidebar border-r border-sidebar-border text-sidebar-foreground transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full apex-orb" />
            <div>
              <div className="font-serif text-lg leading-none">ApexCode</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">by Seulop</div>
            </div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-full hover:bg-sidebar-accent flex items-center justify-center" aria-label="Закрыть">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-3">
          <button
            onClick={onNew}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition"
          >
            <Plus className="h-4 w-4" />
            <span className="font-medium text-sm">Новый чат</span>
          </button>
        </div>

        <div className="px-2 pb-24 overflow-y-auto h-[calc(100dvh-200px)]">
          <div className="px-2 py-2 text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Недавнее
          </div>
          {threads.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">Пока нет чатов</div>
          )}
          <ul className="flex flex-col gap-0.5">
            {threads.map((t) => (
              <li key={t.id} className={`group flex items-center gap-1 rounded-lg ${t.id === activeId ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60"}`}>
                <button
                  onClick={() => onSelect(t.id)}
                  className="flex-1 text-left px-3 py-2 text-sm truncate"
                >
                  {t.title || "Без названия"}
                </button>
                <button
                  onClick={() => { if (confirm("Удалить чат?")) onDelete(t.id); }}
                  className="mr-1 opacity-0 group-hover:opacity-100 h-8 w-8 rounded-md hover:bg-destructive/20 hover:text-destructive flex items-center justify-center"
                  aria-label="Удалить"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-sidebar-border bg-sidebar space-y-2">
          <button
            onClick={onOpenPlans}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-primary/25 to-primary/5 hover:from-primary/35 border border-primary/30 transition text-sm"
          >
            <Crown className="h-4 w-4 text-primary" />
            <span className="font-medium">Тарифы</span>
            <span className="ml-auto text-[10px] uppercase tracking-widest text-primary/90 border border-primary/40 rounded-full px-1.5 py-0.5">
              {plan.label}
            </span>
          </button>
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-sidebar-accent hover:bg-accent transition text-sm"
          >
            <SettingsIcon className="h-4 w-4" />
            Настройки
          </button>
        </div>
      </aside>
    </>
  );
}