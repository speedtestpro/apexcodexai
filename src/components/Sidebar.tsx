import { useState } from "react";
import { X, Plus, Trash2, Settings as SettingsIcon, Sparkles, Crown, BarChart3, Folder as FolderIcon, FolderPlus, FolderInput, ChevronRight, Pencil } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Thread, Folder } from "@/lib/storage";
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
  folders: Folder[];
  onFoldersChange: (f: Folder[]) => void;
  onNewInFolder: (folderId: string) => void;
  onMoveThread: (threadId: string, folderId: string | undefined) => void;
};

export default function Sidebar({ open, onClose, threads, activeId, onSelect, onNew, onDelete, onOpenSettings, onOpenPlans, currentPlan, folders, onFoldersChange, onNewInFolder, onMoveThread }: Props) {
  const plan = getPlan(currentPlan);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const folderIds = new Set(folders.map((f) => f.id));
  const loose = threads.filter((t) => !t.folderId || !folderIds.has(t.folderId));

  function addFolder() {
    const name = prompt("Название проекта")?.trim();
    if (!name) return;
    const instructions = prompt("Инструкции для ИИ в этом проекте (можно оставить пустым)") ?? "";
    const f: Folder = { id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name, instructions, createdAt: Date.now() };
    onFoldersChange([f, ...folders]);
    setOpenFolders((p) => ({ ...p, [f.id]: true }));
  }
  function editFolder(f: Folder) {
    const name = prompt("Название проекта", f.name)?.trim();
    if (!name) return;
    const instructions = prompt("Инструкции для ИИ в этом проекте", f.instructions) ?? f.instructions;
    onFoldersChange(folders.map((x) => (x.id === f.id ? { ...x, name, instructions } : x)));
  }
  function deleteFolder(f: Folder) {
    if (!confirm(`Удалить проект «${f.name}»? Чаты останутся в «Недавнем».`)) return;
    onFoldersChange(folders.filter((x) => x.id !== f.id));
  }
  function moveThread(t: Thread) {
    const opts = ["0 — Без проекта", ...folders.map((f, i) => `${i + 1} — ${f.name}`)].join("\n");
    const v = prompt(`Переместить чат в проект (введите номер):\n${opts}`);
    if (v === null) return;
    const n = Number(v);
    if (Number.isNaN(n)) return;
    onMoveThread(t.id, n === 0 ? undefined : folders[n - 1]?.id);
  }

  const row = (t: Thread) => (
    <li key={t.id} className={`group flex items-center gap-0.5 rounded-lg ${t.id === activeId ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60"}`}>
      <button onClick={() => onSelect(t.id)} className="flex-1 min-w-0 text-left px-3 py-2 text-sm truncate">
        {t.title || "Без названия"}
      </button>
      <button
        onClick={() => moveThread(t)}
        className="opacity-60 group-hover:opacity-100 h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center"
        aria-label="Переместить в проект"
        title="Переместить в проект"
      >
        <FolderInput className="h-4 w-4" />
      </button>
      <button
        onClick={() => { if (confirm("Удалить чат?")) onDelete(t.id); }}
        className="mr-1 opacity-60 group-hover:opacity-100 h-8 w-8 rounded-md hover:bg-destructive/20 hover:text-destructive flex items-center justify-center"
        aria-label="Удалить"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
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
            <FolderIcon className="h-3 w-3" /> Проекты
            <button onClick={addFolder} className="ml-auto h-6 w-6 rounded-md hover:bg-sidebar-accent flex items-center justify-center" aria-label="Новый проект" title="Новый проект">
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
          </div>
          {folders.length === 0 && (
            <button onClick={addFolder} className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
              + Создать проект
            </button>
          )}
          <ul className="flex flex-col gap-0.5 mb-3">
            {folders.map((f) => {
              const isOpen = openFolders[f.id] ?? false;
              const items = threads.filter((t) => t.folderId === f.id);
              return (
                <li key={f.id}>
                  <div className="group flex items-center gap-0.5 rounded-lg hover:bg-sidebar-accent/60">
                    <button onClick={() => setOpenFolders((p) => ({ ...p, [f.id]: !isOpen }))} className="flex-1 min-w-0 flex items-center gap-1.5 px-2 py-2 text-sm">
                      <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                      <FolderIcon className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate">{f.name}</span>
                      <span className="text-[10px] text-muted-foreground">{items.length}</span>
                    </button>
                    <button onClick={() => onNewInFolder(f.id)} className="h-7 w-7 rounded-md hover:bg-accent flex items-center justify-center" aria-label="Новый чат в проекте" title="Новый чат в проекте">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => editFolder(f)} className="h-7 w-7 rounded-md hover:bg-accent flex items-center justify-center" aria-label="Изменить проект" title="Изменить проект">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => deleteFolder(f)} className="mr-1 h-7 w-7 rounded-md hover:bg-destructive/20 hover:text-destructive flex items-center justify-center" aria-label="Удалить проект" title="Удалить проект">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {isOpen && (
                    <ul className="ml-4 border-l border-sidebar-border pl-1 flex flex-col gap-0.5">
                      {items.length === 0 && <li className="px-3 py-1.5 text-xs text-muted-foreground">Пусто</li>}
                      {items.map(row)}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="px-2 py-2 text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Недавнее
          </div>
          {loose.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">Пока нет чатов</div>
          )}
          <ul className="flex flex-col gap-0.5">
            {loose.map(row)}
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
          <Link
            to="/stats"
            onClick={onClose}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-sidebar-accent hover:bg-accent transition text-sm"
          >
            <BarChart3 className="h-4 w-4" />
            Статистика
          </Link>
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