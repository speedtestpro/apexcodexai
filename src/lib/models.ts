export type ApexModel = {
  id: string; // apex id
  label: string;
  description: string;
  gateway: string; // real lovable gateway model
  supportsVision: boolean;
  supportsFiles: boolean;
  supportsWebSearch?: boolean;
  badge?: string;
};

export const APEX_MODELS: ApexModel[] = [
  {
    id: "apex-flash",
    label: "Apex Flash",
    description: "Быстрый универсальный. По умолчанию.",
    gateway: "google/gemini-3-flash-preview",
    supportsVision: true,
    supportsFiles: true,
    supportsWebSearch: true,
    badge: "default",
  },
  {
    id: "apex-pro",
    label: "Apex Pro",
    description: "Мощный, для сложных задач.",
    gateway: "openai/gpt-5",
    supportsVision: true,
    supportsFiles: true,
    supportsWebSearch: true,
    badge: "pro",
  },
  {
    id: "apex-ultra",
    label: "Apex Ultra",
    description: "Максимум качества, медленнее.",
    gateway: "openai/gpt-5.5",
    supportsVision: true,
    supportsFiles: true,
    supportsWebSearch: true,
    badge: "max",
  },
  {
    id: "apex-reasoner",
    label: "Apex Reasoner",
    description: "Глубокий анализ и код.",
    gateway: "openai/gpt-5.4",
    supportsVision: true,
    supportsFiles: true,
    supportsWebSearch: true,
  },
  {
    id: "apex-mini",
    label: "Apex Mini",
    description: "Компактный и дешёвый.",
    gateway: "openai/gpt-5-mini",
    supportsVision: true,
    supportsFiles: true,
    supportsWebSearch: true,
  },
  {
    id: "apex-nano",
    label: "Apex Nano",
    description: "Молниеносный, короткие ответы.",
    gateway: "openai/gpt-5-nano",
    supportsVision: false,
    supportsFiles: false,
  },
  {
    id: "apex-vision",
    label: "Apex Vision",
    description: "Генерация изображений по описанию.",
    gateway: "openai/gpt-image-2",
    supportsVision: true,
    supportsFiles: true,
    badge: "image",
  },
  {
    id: "apex-sonic",
    label: "Apex Sonic",
    description: "Быстрый Gemini 3.5.",
    gateway: "google/gemini-3.5-flash",
    supportsVision: true,
    supportsFiles: true,
    supportsWebSearch: true,
  },
  {
    id: "apex-lite",
    label: "Apex Lite",
    description: "Самый экономичный.",
    gateway: "google/gemini-3.1-flash-lite",
    supportsVision: false,
    supportsFiles: true,
  },
  {
    id: "apex-quasar",
    label: "Apex Quasar",
    description: "Флагман нового поколения для сложного кода и рассуждений.",
    gateway: "openai/gpt-5.6-sol",
    supportsVision: true,
    supportsFiles: true,
    supportsWebSearch: true,
    badge: "new",
  },
];

export const DEFAULT_MODEL_ID = "apex-mini";

export function getModel(id: string): ApexModel {
  return APEX_MODELS.find((m) => m.id === id) ?? APEX_MODELS[0];
}