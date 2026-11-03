import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, FileCode, Plus, Trash2, Send, Terminal, Download, Bot } from "lucide-react";
import { extractProjectFiles, downloadZip } from "@/lib/projectParser";
import { loadPlan } from "@/lib/plans";

export const Route = createFileRoute("/workspace")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ApexAgent Workspace — ApexCode" },
      { name: "description", content: "Агентный режим ApexCode: файлы проекта, чат с агентом и терминал." },
      { property: "og:title", content: "ApexAgent Workspace — ApexCode" },
      { property: "og:description", content: "Агент сам пишет и проверяет код проекта, как Claude Code." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Workspace,
});

type Msg = { role: "user" | "assistant"; content: string };
type WS = { files: Record<string, string>; messages: Msg[]; logs: string[] };
const K = "apexcode:workspace:v1";
const K_DAY = "apexcode:agentday:v1";
const FREE_LIMIT = 5;

function checkFile(path: string, c: string): string {
  if (path.endsWith(".json")) {
    try { JSON.parse(c); return `✓ ${path}: JSON валиден`; } catch (e) { return `✗ ${path}: ${(e as Error).message}`; }
  }
  if (/\.(js|jsx|ts|tsx|css|html|py|java|c|cpp|go|rs)$/.test(path)) {
    const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
    const st: string[] = [];
    for (const ch of c.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, "")) {
      if ("([{".includes(ch)) st.push(ch);
      else if (pairs[ch]) { if (st.pop() !== pairs[ch]) return `✗ ${path}: несбалансированная скобка «${ch}»`; }
    }
    return st.length ? `✗ ${path}: не закрыто «${st.join("")}»` : `✓ ${path}: скобки в порядке`;
  }
  return `✓ ${path}: сохранён`;
}

function Workspace() {
  const [ws, setWs] = useState<WS>({ files: {}, messages: [], logs: ["ApexAgent Workspace готов."] });
  const [sel, setSel] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"code" | "term">("code");
  const plan = typeof window !== "undefined" ? loadPlan() : "free";
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { try { const v = localStorage.getItem(K); if (v) setWs(JSON.parse(v)); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem(K, JSON.stringify(ws)); } catch {} }, [ws]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [ws.messages]);

  function usedToday(): number {
    try { const d = JSON.parse(localStorage.getItem(K_DAY) || "{}"); return d.day === new Date().toDateString() ? d.n : 0; } catch { return 0; }
  }
  const left = plan === "free" ? Math.max(0, FREE_LIMIT - usedToday()) : Infinity;

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    if (plan === "free" && left <= 0) {
      setWs((w) => ({ ...w, logs: [...w.logs, "✗ Лимит Free: 5 запросов агента в день. Повысьте тариф."] }));
      return;
    }
    if (plan === "free") localStorage.setItem(K_DAY, JSON.stringify({ day: new Date().toDateString(), n: usedToday() + 1 }));
    const msgs: Msg[] = [...ws.messages, { role: "user", content: text }];
    setInput("");
    setBusy(true);
    setWs((w) => ({ ...w, messages: [...msgs, { role: "assistant", content: "" }], logs: [...w.logs, `$ agent "${text.slice(0, 60)}"`] }));
    let out = "";
    try {
      const r = await fetch("/api/agent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: msgs, files: ws.files }) });
      if (!r.ok || !r.body) throw new Error(await r.text());
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        out += dec.decode(value, { stream: true });
        const cur = out;
        setWs((w) => ({ ...w, messages: [...msgs, { role: "assistant", content: cur }] }));
      }
      const changed = extractProjectFiles(out);
      const dels = [...out.matchAll(/\[\[DELETE:\s*([^\]]+)\]\]/g)].map((m) => m[1].trim());
      setWs((w) => {
        const files = { ...w.files };
        const logs = [...w.logs];
        for (const f of changed) { files[f.path] = f.content; logs.push(checkFile(f.path, f.content)); }
        for (const d of dels) { delete files[d]; logs.push(`- удалён ${d}`); }
        logs.push(`Готово: изменено ${changed.length}, удалено ${dels.length}`);
        return { ...w, files, logs };
      });
      if (changed[0]) setSel(changed[0].path);
    } catch (e) {
      setWs((w) => ({ ...w, logs: [...w.logs, `✗ Ошибка: ${(e as Error).message.slice(0, 200)}`] }));
    } finally { setBusy(false); }
  }

  function newFile() {
    const p = prompt("Путь файла, например src/index.ts")?.trim();
    if (!p) return;
    setWs((w) => ({ ...w, files: { ...w.files, [p]: "" } }));
    setSel(p);
  }

  const paths = Object.keys(ws.files).sort();

  return (
    <div className="h-dvh flex flex-col bg-background text-foreground">
      <header className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Link to="/" className="h-9 w-9 rounded-full hover:bg-accent flex items-center justify-center" aria-label="Назад"><ArrowLeft className="h-4 w-4" /></Link>
        <Bot className="h-5 w-5 text-primary" />
        <div className="font-serif text-lg">ApexAgent Workspace</div>
        <span className="text-xs text-muted-foreground ml-2">Nemotron Super 3.5 VL</span>
        <span className="ml-auto text-xs text-muted-foreground">{plan === "free" ? `Осталось сегодня: ${left}/${FREE_LIMIT}` : "Без лимита"}</span>
        <button onClick={() => downloadZip("apex-workspace", paths.map((p) => ({ path: p, content: ws.files[p] })))} disabled={!paths.length} className="h-9 px-3 rounded-lg bg-secondary text-sm flex items-center gap-1 disabled:opacity-40"><Download className="h-4 w-4" />.zip</button>
      </header>
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[220px_1fr_1fr]">
        <aside className="border-r border-border overflow-y-auto p-2 hidden md:block">
          <div className="flex items-center text-xs uppercase tracking-wider text-muted-foreground px-1 mb-1">Файлы
            <button onClick={newFile} className="ml-auto h-6 w-6 rounded hover:bg-accent flex items-center justify-center" aria-label="Новый файл"><Plus className="h-3.5 w-3.5" /></button>
          </div>
          {!paths.length && <div className="text-xs text-muted-foreground px-1">Пусто — попросите агента создать проект</div>}
          {paths.map((p) => (
            <div key={p} className={`group flex items-center rounded ${sel === p ? "bg-accent" : "hover:bg-accent/60"}`}>
              <button onClick={() => { setSel(p); setTab("code"); }} className="flex-1 min-w-0 text-left px-2 py-1 text-xs font-mono truncate flex items-center gap-1"><FileCode className="h-3.5 w-3.5 shrink-0" />{p}</button>
              <button onClick={() => setWs((w) => { const f = { ...w.files }; delete f[p]; return { ...w, files: f }; })} className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center hover:text-destructive" aria-label="Удалить"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
        </aside>
        <section className="flex flex-col min-h-0 border-r border-border">
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {!ws.messages.length && <div className="text-sm text-muted-foreground">Опишите задачу: агент составит план, создаст файлы и проверит их в терминале.</div>}
            {ws.messages.map((m, i) => (
              <div key={i} className={`text-sm whitespace-pre-wrap rounded-xl px-3 py-2 ${m.role === "user" ? "bg-primary text-primary-foreground ml-8" : "bg-card mr-4"}`}>{m.content || (busy ? "Агент думает…" : "")}</div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="p-2 border-t border-border flex gap-2">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} rows={2} placeholder="Задача для агента…" className="flex-1 resize-none rounded-xl bg-input px-3 py-2 text-sm outline-none" />
            <button onClick={send} disabled={busy} className="h-10 w-10 self-end rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50" aria-label="Отправить"><Send className="h-4 w-4" /></button>
          </div>
        </section>
        <section className="flex flex-col min-h-0">
          <div className="flex border-b border-border text-xs">
            <button onClick={() => setTab("code")} className={`px-3 py-2 ${tab === "code" ? "border-b-2 border-primary" : "text-muted-foreground"}`}>{sel ?? "Код"}</button>
            <button onClick={() => setTab("term")} className={`px-3 py-2 flex items-center gap-1 ${tab === "term" ? "border-b-2 border-primary" : "text-muted-foreground"}`}><Terminal className="h-3.5 w-3.5" />Терминал</button>
          </div>
          {tab === "code" ? (
            sel && sel in ws.files ? (
              <textarea value={ws.files[sel]} onChange={(e) => setWs((w) => ({ ...w, files: { ...w.files, [sel]: e.target.value } }))} className="flex-1 font-mono text-xs bg-card p-3 outline-none resize-none" spellCheck={false} />
            ) : <div className="p-3 text-sm text-muted-foreground">Выберите файл</div>
          ) : (
            <pre className="flex-1 overflow-y-auto bg-card p-3 font-mono text-xs whitespace-pre-wrap">{ws.logs.join("\n")}</pre>
          )}
        </section>
      </div>
    </div>
  );
}
