import { DEFAULT_MODEL_ID } from "./models";

export type ChatFileAttachment = {
  name: string;
  mimeType: string;
  dataUrl: string; // data:...;base64,...
  kind: "image" | "file";
};

export type ChatSource = {
  title: string;
  url: string;
  snippet?: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
  attachments?: ChatFileAttachment[];
  tokens?: number; // rough estimate
  sources?: ChatSource[];
  rating?: 1 | -1;
};

export type Thread = {
  id: string;
  title: string;
  modelId: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  tokensUsed: number; // per-chat cap 900k
  folderId?: string;
};

export type Folder = {
  id: string;
  name: string;
  instructions: string;
  createdAt: number;
};

const K_FOLDERS = "apexcode:folders:v1";

export function loadFolders(): Folder[] {
  return safeRead(() => {
    const raw = localStorage.getItem(K_FOLDERS);
    const arr = raw ? (JSON.parse(raw) as Folder[]) : [];
    return Array.isArray(arr) ? arr : [];
  }, []);
}
export function saveFolders(f: Folder[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(K_FOLDERS, JSON.stringify(f)); } catch { /* ignore */ }
}
function safeRead<T>(fn: () => T, fb: T): T {
  if (typeof window === "undefined") return fb;
  try { return fn(); } catch { return fb; }
}

export type Settings = {
  userName: string;
  systemPrompt: string;
  temperature: number;
  companyPersona: boolean;
  responseLanguage: "auto" | "ru" | "en";
  density: "comfortable" | "compact";
  showSources: boolean;
  autoDeepThink: boolean;
  sendOnEnter: boolean;
};

export type SessionUsage = {
  used: number; // tokens used in current session
  cooldownUntil: number | null; // ms epoch when unlocked
  requests?: number; // сообщений отправлено в этой сессии (для авто-роутинга)
};

const K_THREADS = "apexcode:threads:v1";
const K_ACTIVE = "apexcode:active:v1";
const K_SETTINGS = "apexcode:settings:v1";
const K_SESSION = "apexcode:session:v1";

export const CHAT_TOKEN_CAP = 1_000_000;
export const SESSION_TOKEN_CAP = 8_000;
export const COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2h

export const DEFAULT_SETTINGS: Settings = {
  userName: "",
  systemPrompt: "",
  temperature: 0.7,
  companyPersona: true,
  responseLanguage: "auto",
  density: "comfortable",
  showSources: true,
  autoDeepThink: false,
  sendOnEnter: true,
};

function safe<T>(fn: () => T, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function loadThreads(): Thread[] {
  return safe(() => {
    const raw = localStorage.getItem(K_THREADS);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Thread[];
    return Array.isArray(arr) ? arr : [];
  }, []);
}

const MAX_INLINE = 150_000; // символов data-url, которые храним в памяти браузера

function slimThreads(threads: Thread[]): Thread[] {
  return threads.map((t) => ({
    ...t,
    messages: t.messages.map((m) => ({
      ...m,
      content:
        m.content.length > MAX_INLINE
          ? m.content.replace(/!\[([^\]]*)\]\(data:[^)]+\)/g, "_(изображение не сохранено — слишком большое)_")
          : m.content,
      attachments: m.attachments?.map((a) =>
        a.dataUrl.length > MAX_INLINE ? { ...a, dataUrl: "" } : a,
      ),
    })),
  }));
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pending: Thread[] | null = null;

export function saveThreads(threads: Thread[]) {
  if (typeof window === "undefined") return;
  pending = threads;
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const data = pending;
    pending = null;
    if (!data) return;
    try {
      localStorage.setItem(K_THREADS, JSON.stringify(slimThreads(data)));
    } catch {
      try {
        // не хватает места — оставляем только последние 10 чатов
        localStorage.setItem(K_THREADS, JSON.stringify(slimThreads(data.slice(0, 10))));
      } catch {
        /* ignore */
      }
    }
  }, 400);
}

export function loadActiveId(): string | null {
  return safe(() => localStorage.getItem(K_ACTIVE), null);
}
export function saveActiveId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(K_ACTIVE, id);
  else localStorage.removeItem(K_ACTIVE);
}

export function loadSettings(): Settings {
  return safe(() => {
    const raw = localStorage.getItem(K_SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  }, DEFAULT_SETTINGS);
}
export function saveSettings(s: Settings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(K_SETTINGS, JSON.stringify(s));
}

export function loadSession(): SessionUsage {
  return safe(() => {
    const raw = localStorage.getItem(K_SESSION);
    if (!raw) return { used: 0, cooldownUntil: null };
    const s = JSON.parse(raw) as SessionUsage;
    // If cooldown expired, reset
    if (s.cooldownUntil && Date.now() >= s.cooldownUntil) {
      return { used: 0, cooldownUntil: null };
    }
    return s;
  }, { used: 0, cooldownUntil: null });
}
export function saveSession(s: SessionUsage) {
  if (typeof window === "undefined") return;
  localStorage.setItem(K_SESSION, JSON.stringify(s));
}

export function newThread(modelId: string = DEFAULT_MODEL_ID): Thread {
  const now = Date.now();
  return {
    id: `t_${now}_${Math.random().toString(36).slice(2, 8)}`,
    title: "Новый чат",
    modelId,
    createdAt: now,
    updatedAt: now,
    messages: [],
    tokensUsed: 0,
  };
}

export function estimateTokens(text: string): number {
  // ~4 chars per token rough; встроенные картинки (data:) считаем фиксированно
  let images = 0;
  const clean = text.replace(/data:[^)\s]+/g, () => { images++; return ""; });
  return Math.ceil(clean.length / 4) + images * 1000;
}