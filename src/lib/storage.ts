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
};

export type Thread = {
  id: string;
  title: string;
  modelId: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  tokensUsed: number; // per-chat cap 900k
};

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

export const CHAT_TOKEN_CAP = 900_000;
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

export function saveThreads(threads: Thread[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(K_THREADS, JSON.stringify(threads));
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
  // ~4 chars per token rough
  return Math.ceil(text.length / 4);
}