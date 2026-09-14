export type ApexModel = {
  id: string; // apex id
  label: string;
  description: string;
  gateway: string; // real lovable gateway model
  supportsVision: boolean;
  supportsFiles: boolean;
  supportsWebSearch?: boolean;
  badge?: string;
  /** Версия линейки Apex для этой модели. */
  version?: string;
};

export const APEX_MODELS: ApexModel[] = [
  {
    id: "apex-flash",
    label: "Apex Flash",
    description: "Быстрый универсальный. По умолчанию.",
    gateway: "google/gemini-3.7-flash",
    supportsVision: true,
    supportsFiles: true,
    supportsWebSearch: true,
    badge: "default",
    version: "2.3",
  },
  {
    id: "apex-pro",
    label: "Apex Pro",
    description: "Мощный, для сложных задач.",
    gateway: "google/gemini-3.1-pro-preview",
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
    gateway: "google/gemini-3.7-flash",
    supportsVision: true,
    supportsFiles: true,
    supportsWebSearch: true,
    badge: "new",
    version: "2.3",
  },
  {
    id: "apex-mars",
    label: "ApexMars",
    description: "Максимальная защита от джейлбрейка и утечек данных.",
    gateway: "google/gemini-3.1-pro-preview",
    supportsVision: true,
    supportsFiles: true,
    supportsWebSearch: true,
    badge: "secure",
    version: "1.1",
  },
  {
    id: "apex-vision",
    label: "Apex Vision",
    description: "Генерация изображений по описанию.",
    gateway: "openai/gpt-image-2",
    supportsVision: true,
    supportsFiles: true,
    badge: "image",
    version: "2.3",
  },
];

export const DEFAULT_MODEL_ID = "apex-flash";

export function getModel(id: string): ApexModel {
  return APEX_MODELS.find((m) => m.id === id) ?? APEX_MODELS[0];
}

/** Стоимость одной генерации изображения: от 800 до 2300 токенов. */
export const IMAGE_TOKENS_MIN = 800;
export const IMAGE_TOKENS_MAX = 2300;

export function imageTokenCost(prompt: string): number {
  const extra = Math.ceil((prompt?.length ?? 0) * 1.5);
  return Math.min(IMAGE_TOKENS_MAX, Math.max(IMAGE_TOKENS_MIN, IMAGE_TOKENS_MIN + extra));
}
