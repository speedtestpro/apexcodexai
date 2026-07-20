// Simple free web search via DuckDuckGo HTML. Runs on Cloudflare Workers.
export type WebSearchResult = { title: string; url: string; snippet: string };

function decodeEntities(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
function stripTags(s: string) {
  return decodeEntities(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}
function unwrapDdgUrl(href: string): string {
  try {
    const u = new URL(href.startsWith("//") ? `https:${href}` : href);
    const target = u.searchParams.get("uddg");
    return target ? decodeURIComponent(target) : href;
  } catch {
    return href;
  }
}

export async function webSearch(query: string, limit = 5): Promise<WebSearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9,ru;q=0.8",
    },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return [];
  const html = await res.text();
  const results: WebSearchResult[] = [];
  const re = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && results.length < limit) {
    const url = unwrapDdgUrl(m[1]);
    const title = stripTags(m[2]);
    const snippet = stripTags(m[3]);
    if (title && url) results.push({ title, url, snippet });
  }
  return results;
}

export function formatWebSearchForPrompt(query: string, results: WebSearchResult[]) {
  if (!results.length) return `Веб-поиск по запросу "${query}" не дал результатов.`;
  const lines = results.map(
    (r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.snippet}`,
  );
  return `Ниже — свежие результаты веб-поиска по запросу "${query}". Используй их, чтобы дать актуальный ответ. Ссылайся на источники как [1], [2] и т.д.\n\n${lines.join("\n\n")}`;
}
