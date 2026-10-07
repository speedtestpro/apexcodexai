import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

export function createLovableAiGatewayProvider(lovableApiKey: string) {
  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: {
      "Lovable-API-Key": lovableApiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}

export const GEMINI_OPENAI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";
export const GEMINI_NATIVE_BASE = "https://generativelanguage.googleapis.com/v1beta";

function geminiProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "gemini",
    baseURL: GEMINI_OPENAI_BASE,
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

function openaiProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "openai",
    baseURL: "https://api.openai.com/v1",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

/**
 * Выбирает провайдера по префиксу id модели:
 * google/* -> Gemini API (GEMINI_API_KEY)
 * openai/* -> OpenAI API (OPENAI_API_KEY)
 * иначе    -> Lovable AI Gateway (LOVABLE_API_KEY)
 */
export function resolveModel(gatewayModelId: string): LanguageModel {
  const [vendor, ...rest] = gatewayModelId.split("/");
  const name = rest.join("/") || gatewayModelId;

  if (vendor === "google") {
    const key = process.env["GEMINI_API_KEY"];
    if (!key) throw new Error("Missing GEMINI_API_KEY");
    return geminiProvider(key)(name);
  }
  if (vendor === "agnes") {
    const key = process.env["OPENAI_API_KEY"];
    if (!key) throw new Error("Missing Agnes API key");
    return createOpenAICompatible({
      name: "agnes",
      baseURL: "https://apihub.agnes-ai.com/v1",
      headers: { Authorization: `Bearer ${key}` },
    })(name);
  }
  if (vendor === "openai") {
    const key = process.env["OPENAI_API_KEY"];
    if (!key) throw new Error("Missing OPENAI_API_KEY");
    return openaiProvider(key)(name);
  }
  const lovable = process.env["LOVABLE_API_KEY"];
  if (!lovable) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(lovable)(gatewayModelId);
}

/** Генерация изображения. Возвращает data-url или бросает ошибку с понятным текстом. */
export async function generateImageDataUrl(gatewayModelId: string, prompt: string): Promise<string> {
  const [vendor, ...rest] = gatewayModelId.split("/");
  const name = rest.join("/") || gatewayModelId;

  if (vendor === "google") {
    const key = process.env["GEMINI_API_KEY"];
    if (!key) throw new Error("Missing GEMINI_API_KEY");
    const r = await fetch(`${GEMINI_NATIVE_BASE}/models/${name}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    });
    const text = await r.text();
    if (!r.ok) throw Object.assign(new Error(text.slice(0, 300)), { statusCode: r.status });
    const data = JSON.parse(text) as {
      candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> } }>;
    };
    const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (!part?.inlineData?.data) throw new Error("Модель не вернула изображение");
    return `data:${part.inlineData.mimeType ?? "image/png"};base64,${part.inlineData.data}`;
  }

  if (vendor === "agnes") {
    const key = process.env["OPENAI_API_KEY"];
    if (!key) throw new Error("Нет ключа Agnes для генерации изображений");
    const r = await fetch("https://apihub.agnes-ai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ model: name, prompt, n: 1 }),
    });
    const t = await r.text();
    if (!r.ok) throw Object.assign(new Error(t.slice(0, 300)), { statusCode: r.status });
    const d = JSON.parse(t) as { data?: Array<{ b64_json?: string; url?: string }> };
    const f = d.data?.[0];
    if (f?.b64_json) return `data:image/png;base64,${f.b64_json}`;
    if (f?.url) return f.url;
    throw new Error("Модель не вернула изображение");
  }

  if (vendor === "lovable") {
    const lk = process.env["LOVABLE_API_KEY"];
    if (!lk) throw new Error("Нет ключа для генерации изображений");
    const r = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${lk}`, "content-type": "application/json" },
      body: JSON.stringify({ model: name, prompt, quality: "low" }),
    });
    const t = await r.text();
    if (!r.ok) throw Object.assign(new Error(t.slice(0, 300)), { statusCode: r.status });
    const d = JSON.parse(t) as { data?: Array<{ b64_json?: string; url?: string }> };
    const f = d.data?.[0];
    if (f?.b64_json) return `data:image/png;base64,${f.b64_json}`;
    if (f?.url) return f.url;
    throw new Error("Модель не вернула изображение");
  }

  const key =
    vendor === "openai" ? process.env["OPENAI_API_KEY"] : process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Нет ключа для генерации изображений");
  const url =
    vendor === "openai"
      ? "https://api.openai.com/v1/images/generations"
      : "https://ai.gateway.lovable.dev/v1/images/generations";
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ model: name, prompt, quality: "low" }),
  });
  const text = await r.text();
  if (!r.ok) throw Object.assign(new Error(text.slice(0, 300)), { statusCode: r.status });
  const data = JSON.parse(text) as { data?: Array<{ b64_json?: string; url?: string }> };
  const first = data.data?.[0];
  if (first?.b64_json) return `data:image/png;base64,${first.b64_json}`;
  if (first?.url) return first.url;
  throw new Error("Модель не вернула изображение");
}
