import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  loadThreads, saveThreads, loadActiveId, saveActiveId,
  loadSettings, saveSettings, loadSession, saveSession,
  newThread, estimateTokens,
  CHAT_TOKEN_CAP,
  SESSION_TOKEN_CAP, COOLDOWN_MS,
  type Thread, type ChatMessage, type Settings, type ChatFileAttachment, type SessionUsage,
} from "@/lib/storage";
import { APEX_MODELS, DEFAULT_MODEL_ID, getModel } from "@/lib/models";
import Sidebar from "./Sidebar";
import Composer from "./Composer";
import MessageList from "./MessageList";
import ModelPicker from "./ModelPicker";
import SettingsDialog from "./SettingsDialog";
import WelcomeOrb from "./WelcomeOrb";
import PlansDialog from "./PlansDialog";
import { getPlan, loadPlan, savePlan, autoRouteModelId, type PlanId } from "@/lib/plans";
import { Menu, MessageSquarePlus, Settings as SettingsIcon } from "lucide-react";

function uid() { return `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }

export default function ChatPage({ threadId }: { threadId: string }) {
  const navigate = useNavigate();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [settings, setSettings] = useState<Settings>(loadSettings());
  const [session, setSession] = useState<SessionUsage>({ used: 0, cooldownUntil: null });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [plan, setPlan] = useState<PlanId>("free");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [deepThink, setDeepThink] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // hydrate from localStorage on mount
  useEffect(() => {
    const t = loadThreads();
    setThreads(t);
    setSettings(loadSettings());
    setSession(loadSession());
    setPlan(loadPlan());
    saveActiveId(threadId);
    // Auto reset cooldown ticker
    const int = setInterval(() => {
      setSession((prev) => {
        if (prev.cooldownUntil && Date.now() >= prev.cooldownUntil) {
          const next = { used: 0, cooldownUntil: null };
          saveSession(next);
          return next;
        }
        return prev;
      });
    }, 5000);
    return () => clearInterval(int);
  }, [threadId]);

  const thread = useMemo(() => threads.find((t) => t.id === threadId), [threads, threadId]);

  // If URL threadId not in list, create it
  useEffect(() => {
    if (threads.length === 0) return;
    if (!thread) {
      const t = newThread();
      t.id = threadId;
      const next = [t, ...threads];
      setThreads(next);
      saveThreads(next);
    }
  }, [threads, thread, threadId]);

  const updateThread = useCallback((id: string, updater: (t: Thread) => Thread) => {
    setThreads((prev) => {
      const next = prev.map((t) => (t.id === id ? updater(t) : t));
      saveThreads(next);
      return next;
    });
  }, []);

  const createNewChat = useCallback((modelId?: string) => {
    const t = newThread(modelId ?? settings ? DEFAULT_MODEL_ID : DEFAULT_MODEL_ID);
    const next = [t, ...threads];
    setThreads(next);
    saveThreads(next);
    saveActiveId(t.id);
    navigate({ to: "/c/$threadId", params: { threadId: t.id } });
  }, [threads, navigate, settings]);

  const deleteThread = useCallback((id: string) => {
    const next = threads.filter((t) => t.id !== id);
    setThreads(next);
    saveThreads(next);
    if (id === threadId) {
      const target = next[0]?.id;
      if (target) navigate({ to: "/c/$threadId", params: { threadId: target } });
      else {
        const t = newThread();
        saveThreads([t]);
        navigate({ to: "/c/$threadId", params: { threadId: t.id } });
      }
    }
  }, [threads, threadId, navigate]);

  const currentPlanObj = getPlan(plan);
  const sessionCap = currentPlanObj.sessionCap;
  const manualPick = currentPlanObj.manualModelPick;
  const autoModelId = autoRouteModelId(currentPlanObj, session.requests ?? 0);
  const activeModelId = manualPick ? (thread?.modelId ?? DEFAULT_MODEL_ID) : autoModelId;

  const changeModel = useCallback((modelId: string) => {
    if (!thread) return;
    if (!manualPick) { setPlansOpen(true); return; }
    if (!currentPlanObj.models.includes(modelId)) { setPlansOpen(true); return; }
    if (thread.messages.length === 0) {
      updateThread(thread.id, (t) => ({ ...t, modelId }));
      return;
    }
    // Model change requires a new chat
    createNewChat(modelId);
  }, [thread, updateThread, createNewChat, currentPlanObj, manualPick]);

  const sendMessage = useCallback(async (text: string, attachments: ChatFileAttachment[], history?: ChatMessage[]) => {
    if (!thread) return;
    setError(null);
    if (session.cooldownUntil && Date.now() < session.cooldownUntil) {
      setError(`Сессионный лимит достигнут. Восстановление через ${formatCooldown(session.cooldownUntil - Date.now())}.`);
      return;
    }
    if (thread.tokensUsed >= CHAT_TOKEN_CAP) {
      setError("Достигнут лимит 900 000 токенов на этот чат. Начните новый чат.");
      return;
    }
    if (!currentPlanObj.models.includes(activeModelId)) {
      setError(`Модель "${getModel(activeModelId).label}" недоступна на тарифе ${currentPlanObj.label}. Смените модель или тариф.`);
      setPlansOpen(true);
      return;
    }
    const userMsg: ChatMessage = {
      id: uid(), role: "user", content: text, attachments: attachments.length ? attachments : undefined,
      createdAt: Date.now(), tokens: estimateTokens(text),
    };
    const isFirst = (history ?? thread.messages).length === 0;
    const newTitle = isFirst ? text.slice(0, 40) || "Новый чат" : thread.title;
    updateThread(thread.id, (t) => ({
      ...t, title: newTitle, messages: [...(history ?? t.messages), userMsg], updatedAt: Date.now(),
    }));

    const outgoing = [...(history ?? thread.messages), userMsg].map((m) => ({
      role: m.role, content: m.content, attachments: m.attachments,
    }));

    setStreaming(true);
    setStreamText("");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: outgoing,
          modelId: activeModelId,
          systemPrompt: settings.systemPrompt,
          userName: settings.userName,
          webSearch: webSearchEnabled && (getModel(activeModelId).supportsWebSearch ?? false),
          deepThink,
        }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const msg = await res.text().catch(() => "Ошибка запроса");
        throw new Error(msg || `HTTP ${res.status}`);
      }
      // Extract sources header (base64-encoded JSON) if present
      let sources: import("@/lib/storage").ChatSource[] | undefined;
      const srcHeader = res.headers.get("x-apex-sources");
      if (srcHeader) {
        try {
          const json = decodeURIComponent(escape(atob(srcHeader)));
          const parsed = JSON.parse(json);
          if (Array.isArray(parsed) && parsed.length) sources = parsed;
        } catch { /* ignore */ }
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value, { stream: true });
        full += chunk;
        setStreamText(full);
      }
      const assistant: ChatMessage = {
        id: uid(), role: "assistant", content: full, createdAt: Date.now(), tokens: estimateTokens(full),
        sources,
      };
      const totalTokens = (userMsg.tokens ?? 0) + (assistant.tokens ?? 0);
      updateThread(thread.id, (t) => ({
        ...t,
        messages: [...t.messages, assistant],
        tokensUsed: t.tokensUsed + totalTokens,
        updatedAt: Date.now(),
      }));
      setSession((prev) => {
        const newUsed = prev.used + totalTokens;
        const requests = (prev.requests ?? 0) + 1;
        let next: SessionUsage;
        if (newUsed >= sessionCap) {
          const hours = 2 + Math.random() * 2; // 2-4h
          next = { used: newUsed, requests, cooldownUntil: Date.now() + hours * 60 * 60 * 1000 };
        } else {
          next = { used: newUsed, requests, cooldownUntil: null };
        }
        saveSession(next);
        return next;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Ошибка";
      if (msg !== "AbortError" && !msg.includes("aborted")) setError(msg);
    } finally {
      setStreaming(false);
      setStreamText("");
      abortRef.current = null;
    }
  }, [thread, session, settings, updateThread, sessionCap, webSearchEnabled, deepThink, currentPlanObj, activeModelId]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const currentModel = getModel(activeModelId);
  const cooldownActive = !!(session.cooldownUntil && Date.now() < session.cooldownUntil);

  return (
    <div className="flex h-dvh bg-background text-foreground overflow-hidden">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        threads={threads}
        activeId={threadId}
        onSelect={(id) => { setSidebarOpen(false); navigate({ to: "/c/$threadId", params: { threadId: id } }); }}
        onNew={() => { setSidebarOpen(false); createNewChat(); }}
        onDelete={deleteThread}
        onOpenSettings={() => { setSidebarOpen(false); setSettingsOpen(true); }}
        onOpenPlans={() => { setSidebarOpen(false); setPlansOpen(true); }}
        currentPlan={plan}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="apex-glass-soft flex items-center justify-between px-3 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="h-10 w-10 rounded-full bg-secondary hover:bg-accent flex items-center justify-center transition-colors"
            aria-label="Меню"
          >
            <Menu className="h-5 w-5" />
          </button>
          <ModelPicker
            current={currentModel.id}
            onChange={changeModel}
            allowedIds={manualPick ? currentPlanObj.models : []}
            autoMode={!manualPick}
            onLockedPick={() => setPlansOpen(true)}
          />
          <button
            onClick={() => createNewChat()}
            className="h-10 w-10 rounded-full bg-secondary hover:bg-accent flex items-center justify-center transition-colors"
            aria-label="Новый чат"
          >
            <MessageSquarePlus className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          {thread && thread.messages.length === 0 && !streaming ? (
            <WelcomeOrb userName={settings.userName} modelLabel={currentModel.label} />
          ) : (
            <MessageList
              messages={thread?.messages ?? []}
              streamingText={streaming ? streamText : ""}
              userName={settings.userName}
              streaming={streaming}
              webSearching={streaming && webSearchEnabled && !!currentModel.supportsWebSearch}
              onRate={(id, r) => thread && updateThread(thread.id, (t) => ({
                ...t,
                messages: t.messages.map((m) => (m.id === id ? { ...m, rating: m.rating === r ? undefined : r } : m)),
              }))}
              onRegenerate={() => {
                if (!thread || streaming) return;
                const msgs = thread.messages;
                let i = msgs.length - 1;
                while (i >= 0 && msgs[i].role !== "user") i--;
                if (i < 0) return;
                const u = msgs[i];
                void sendMessage(u.content, u.attachments ?? [], msgs.slice(0, i));
              }}
            />
          )}
        </main>

        {error && (
          <div className="mx-3 mb-2 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive text-sm px-3 py-2">
            {error}
          </div>
        )}

        <div className="border-t border-border px-3 pt-2 pb-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
            <span>
              Чат: {formatK(thread?.tokensUsed ?? 0)} / 900k
            </span>
            <span>
              Сессия: {formatK(session.used)} / {formatK(sessionCap)} · {currentPlanObj.label}
              {cooldownActive && ` • восстановится через ${formatCooldown(session.cooldownUntil! - Date.now())}`}
            </span>
          </div>
          <Composer
            disabled={streaming || cooldownActive}
            supportsFiles={currentModel.supportsFiles || currentModel.supportsVision}
            supportsVision={currentModel.supportsVision}
            supportsWebSearch={!!currentModel.supportsWebSearch}
            webSearch={webSearchEnabled}
            onToggleWebSearch={setWebSearchEnabled}
            deepThink={deepThink}
            onToggleDeepThink={setDeepThink}
            onSend={sendMessage}
            onStop={stop}
            streaming={streaming}
          />
        </div>
      </div>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSave={(s) => { setSettings(s); saveSettings(s); }}
      />
      <PlansDialog
        open={plansOpen}
        onClose={() => setPlansOpen(false)}
        currentPlan={plan}
        userName={settings.userName}
        onSelected={(id) => { setPlan(id); savePlan(id); }}
      />
    </div>
  );
}

function formatK(n: number) {
  if (n < 1000) return `${n}`;
  return `${(n / 1000).toFixed(1)}k`;
}
function formatCooldown(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}ч ${m}м`;
  return `${m}м`;
}

// silence unused import warning if any
void APEX_MODELS;
void SettingsIcon;