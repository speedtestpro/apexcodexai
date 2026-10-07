export type ApexModel = {
  id: string; // apex id
  label: string;
  description: string;
  gateway: string; // real lovable gateway model
  supportsVision: boolean;
  supportsFiles: boolean;
  supportsWebSearch?: boolean;
  /** Модель шлюза, если в запросе есть загруженные файлы/фото. */
  visionGateway?: string;
  badge?: string;
  /** Версия линейки Apex для этой модели. */
  version?: string;
  /** Только через API, скрыта в интерфейсе. */
  apiOnly?: boolean;
};

export const APEX_MODELS: ApexModel[] = [
  {
    id: "apex-flash",
    label: "Apex Flash",
    description: "Быстрый универсальный. По умолчанию.",
    gateway: "google/gemini-3.5-flash-lite",
    supportsVision: true,
    supportsFiles: true,
    supportsWebSearch: true,
    badge: "api",
    apiOnly: true,
    version: "2.3",
  },
  {
    id: "apex-pro",
    label: "Apex Pro",
    description: "Мощный, для сложных задач.",
    gateway: "google/gemini-3.5-flash-lite",
    supportsVision: true,
    supportsFiles: true,
    supportsWebSearch: true,
    badge: "pro",
    version: "2.3",
  },
  {
    id: "apex-quasar",
    label: "Apex Quasar",
    description: "Флагман нового поколения для сложного кода и рассуждений.",
    gateway: "google/gemini-3.5-flash-lite",
    supportsVision: true,
    supportsFiles: true,
    supportsWebSearch: true,
    badge: "new",
    version: "2.3",
  },
  {
    id: "apex-mars",
    label: "ApexMars",
    description: "Для школьников: помощь с домашкой и объяснения. Максимальная защита от джейлбрейка.",
    gateway: "google/gemini-3.5-flash-lite",
    visionGateway: "google/gemini-robotics-er-2-preview",
    supportsVision: true,
    supportsFiles: true,
    supportsWebSearch: true,
    badge: "школа",
    version: "1.2",
  },
];

export const DEFAULT_MODEL_ID = "apex-mars";

/** Модели, умеющие генерировать фото прямо в чате. */
export const IMAGE_CAPABLE_MODELS = ["apex-mars", "apex-quasar"];
export const IMAGE_GATEWAY = "agnes/agnes-image-2.5-flash";

/** Определяет, просит ли пользователь сгенерировать изображение. */
export function wantsImage(text: string): boolean {
  const t = (text || "").toLowerCase();
  return (
    /(нарисуй|нарисовать|сгенерируй|сгенерировать|создай|сделай|покажи)\s+(мне\s+)?(фото|фотку|картинк|изображени|рисунок|арт|логотип|иллюстрац|обои|аватар)/.test(t) ||
    /^нарисуй/.test(t.trim()) ||
    /\b(draw|generate|create|make)\b.{0,20}\b(image|picture|photo|art|logo|illustration)\b/.test(t)
  );
}

export function getModel(id: string): ApexModel {
  return APEX_MODELS.find((m) => m.id === id) ?? APEX_MODELS.find((m) => m.id === DEFAULT_MODEL_ID)!;
}

/** Стоимость одной генерации изображения: от 800 до 2300 токенов. */
export const IMAGE_TOKENS_MIN = 800;
export const IMAGE_TOKENS_MAX = 2300;

export function imageTokenCost(prompt: string): number {
  const extra = Math.ceil((prompt?.length ?? 0) * 1.5);
  return Math.min(IMAGE_TOKENS_MAX, Math.max(IMAGE_TOKENS_MIN, IMAGE_TOKENS_MIN + extra));
}
