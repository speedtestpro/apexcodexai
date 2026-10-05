import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage, ChatSource } from "@/lib/storage";
import { Download, FileText, Globe, ExternalLink, Brain, ChevronDown, Copy, Check } from "lucide-react";
import GeneratedImage from "./GeneratedImage";
import { extractProjectFiles, downloadZip } from "@/lib/projectParser";

/** Закрывает незавершённый ``` блок во время стриминга, чтобы разметка не «ломалась». */
function balanceFences(text: string): string {
  const fences = (text.match(/^```/gm) ?? []).length;
  return fences % 2 === 1 ? `${text}\n\u0060\u0060\u0060` : text;
}

/** Если markdown-рендер упал — показываем обычный текст вместо пустого экрана. */
class MarkdownBoundary extends Component<{ fallback: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidUpdate(prev: { fallback: string }) {
    if (this.state.failed && prev.fallback !== this.props.fallback) this.setState({ failed: false });
  }
  render() {
    if (this.state.failed) {
      return <pre className="whitespace-pre-wrap break-words text-sm">{this.props.fallback}</pre>;
    }
    return this.props.children;
  }
}

function CodeBlock({ code, lang }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="apex-glass rounded-xl my-2 overflow-hidden not-prose">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/40">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{lang || "text"}</span>
        <button
          onClick={copy}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition"
        >
          {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
          {copied ? "Скопировано" : "Копировать"}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-2.5 text-[13px] leading-relaxed">
        <code className="font-mono whitespace-pre">{code}</code>
      </pre>
    </div>
  );
}

function splitThink(content: string): { think: string | null; body: string; thinking: boolean } {
  const openIdx = content.indexOf("<think>");
  if (openIdx === -1) return { think: null, body: content, thinking: false };
  const closeIdx = content.indexOf("</think>", openIdx);
  if (closeIdx === -1) {
    // still streaming think block
    return { think: content.slice(openIdx + 7).trim(), body: content.slice(0, openIdx).trim(), thinking: true };
  }
  const think = content.slice(openIdx + 7, closeIdx).trim();
  const body = (content.slice(0, openIdx) + content.slice(closeIdx + 8)).trim();
  return { think, body, thinking: false };
}

function ThinkBlock({ think, thinking }: { think: string; thinking: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="apex-glass rounded-2xl px-3 py-2 mb-2 text-sm">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 w-full text-left">
        <Brain className={`h-4 w-4 ${thinking ? "apex-shimmer-icon" : "text-primary"}`} />
        <span className={thinking ? "apex-shimmer-text" : "text-muted-foreground"}>
          {thinking ? "Глубокое раздумие…" : "Раздумия модели"}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 ml-auto text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-2 pt-2 border-t border-border/50 whitespace-pre-wrap text-muted-foreground text-[13px] leading-relaxed">
          {think}
        </div>
      )}
    </div>
  );
}

export default function MessageList({ messages, streamingText, userName, streaming, webSearching, onRate, onRegenerate }: { messages: ChatMessage[]; streamingText: string; userName: string; streaming?: boolean; webSearching?: boolean; onRate?: (id: string, r: 1 | -1) => void; onRegenerate?: () => void }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingText, streaming]);

  const showPlaceholder = streaming && !streamingText;

  return (
    <div className="mx-auto max-w-2xl px-3 py-4 flex flex-col gap-5">
      {messages.map((m, i) => (
        <div key={m.id} className="flex flex-col gap-1">
          <Bubble message={m} userName={userName} />
          {m.role === "assistant" && !(streaming && i === messages.length - 1) && (
            <MessageActions
              message={m}
              isLast={i === messages.length - 1}
              disabled={!!streaming}
              onRate={onRate}
              onRegenerate={onRegenerate}
            />
          )}
        </div>
      ))}
      {streamingText && (
        <Bubble
          message={{ id: "streaming", role: "assistant", content: streamingText, createdAt: Date.now() }}
          userName={userName}
          streaming
        />
      )}
      {showPlaceholder && (
        <div className="flex justify-start">
          <div className="flex gap-3 max-w-full">
            <div className="h-7 w-7 shrink-0 rounded-full apex-orb mt-0.5 animate-pulse-orb" />
            <div className="flex items-center min-h-7">
              {webSearching ? (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-3.5 w-3.5 shrink-0 apex-shimmer-icon" />
                  <span className="apex-shimmer-text">Поиск в интернете…</span>
                </div>
              ) : (
                <div className="apex-typing" aria-label="печатает">
                  <span /><span /><span />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}

function faviconUrl(url: string) {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`;
  } catch {
    return "";
  }
}

function hostFrom(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

function SourcesChips({ sources }: { sources: ChatSource[] }) {
  const [open, setOpen] = useState(false);
  const shown = sources.slice(0, 4);
  const extra = sources.length - shown.length;
  return (
    <div className="relative mt-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/70 hover:bg-accent transition-colors px-1.5 py-1"
        aria-label="Показать источники"
      >
        <div className="flex -space-x-1.5">
          {shown.map((s, i) => (
            <div
              key={i}
              className="h-5 w-5 rounded-full bg-background border border-border overflow-hidden flex items-center justify-center"
              style={{ zIndex: shown.length - i }}
            >
              <img
                src={faviconUrl(s.url)}
                alt=""
                className="h-4 w-4"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          ))}
        </div>
        <span className="text-[11px] text-muted-foreground pr-1.5">
          {extra > 0 ? `${sources.length} источников` : `${sources.length} ${sources.length === 1 ? "источник" : "источника"}`}
        </span>
      </button>
      {open && (
        <div className="absolute z-20 mt-2 w-[min(22rem,80vw)] rounded-xl border border-border bg-popover shadow-xl p-2">
          <div className="text-[11px] text-muted-foreground px-2 py-1">Источники</div>
          <div className="flex flex-col">
            {sources.map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-2 rounded-lg px-2 py-2 hover:bg-accent"
              >
                <img
                  src={faviconUrl(s.url)}
                  alt=""
                  className="h-4 w-4 mt-0.5 rounded-sm"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-foreground truncate">{s.title || hostFrom(s.url)}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{hostFrom(s.url)}</div>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Bubble({ message, userName, streaming }: { message: ChatMessage; userName: string; streaming?: boolean }) {
  const isUser = message.role === "user";
  const { think, body, thinking } = !isUser ? splitThink(message.content) : { think: null, body: message.content, thinking: false };
  const files = message.role === "assistant" ? extractProjectFiles(body) : [];

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""} max-w-full`}>
        {!isUser && (
          <div className="h-7 w-7 shrink-0 rounded-full apex-orb mt-0.5" />
        )}
        <div className={`flex flex-col gap-2 min-w-0 ${isUser ? "items-end" : "items-start"}`}>
          {isUser && userName && (
            <div className="text-xs text-muted-foreground pr-1">{userName}</div>
          )}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {message.attachments.map((a, i) => (
                a.kind === "image" ? (
                  <img key={i} src={a.dataUrl} alt={a.name} className="max-h-48 max-w-48 rounded-lg border border-border" />
                ) : (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-xs">
                    <FileText className="h-3.5 w-3.5" /> {a.name}
                  </div>
                )
              ))}
            </div>
          )}
          {!isUser && think && <ThinkBlock think={think} thinking={thinking} />}
          <div className={
            isUser
              ? "rounded-2xl px-4 py-2.5 bg-secondary text-foreground whitespace-pre-wrap break-words"
              : "prose-apex text-foreground max-w-full break-words"
          }>
            {isUser ? (
              <span>{message.content}</span>
            ) : (
              <MarkdownBoundary fallback={body}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  urlTransform={(url) => url}
                  components={{
                    img: ({ src, alt }) => <GeneratedImage src={String(src ?? "")} alt={alt ?? "Изображение"} />,
                    p: ({ children }) => <p>{children}</p>,
                    pre: ({ children }) => <>{children}</>,
                    code: ({ className, children, ...props }) => {
                      const text = String(children ?? "").replace(/\n$/, "");
                      const lang = /language-(\w+)/.exec(className ?? "")?.[1];
                      const isBlock = Boolean(lang) || text.includes("\n");
                      if (!isBlock) {
                        return (
                          <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[0.85em]" {...props}>
                            {children}
                          </code>
                        );
                      }
                      return <CodeBlock code={text} lang={lang} />;
                    },
                  }}
                >{balanceFences(body) || (streaming ? "…" : "")}</ReactMarkdown>
              </MarkdownBoundary>
            )}
          </div>
          {!isUser && !streaming && message.sources && message.sources.length > 0 && (
            <SourcesChips sources={message.sources} />
          )}
          {!isUser && files.length > 0 && !streaming && (
            <button
              onClick={() => downloadZip(`apexcode-project-${message.id.slice(-6)}`, files)}
              className="mt-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
            >
              <Download className="h-3.5 w-3.5" />
              Скачать проект (.zip) — {files.length} {files.length === 1 ? "файл" : "файлов"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageActions({ message, isLast, disabled, onRate, onRegenerate }: { message: ChatMessage; isLast: boolean; disabled: boolean; onRate?: (id: string, r: 1 | -1) => void; onRegenerate?: () => void }) {
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const plain = splitThink(message.content).body.replace(/!\[[^\]]*\]\(data:[^)]+\)/g, "").trim();
  const btn = "h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition disabled:opacity-40";
  const on = "text-primary";

  function copy() {
    void navigator.clipboard?.writeText(plain).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  function speak() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(plain.replace(/[#*`>_]/g, ""));
    u.lang = /[а-яё]/i.test(plain) ? "ru-RU" : "en-US";
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  }
  function share() {
    if (navigator.share) void navigator.share({ text: plain }).catch(() => {});
    else copy();
  }

  return (
    <div className="flex items-center gap-0.5 pl-9 -mt-1">
      <button className={btn} onClick={copy} aria-label="Копировать" title="Копировать">
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
      <button className={`${btn} ${message.rating === 1 ? on : ""}`} onClick={() => onRate?.(message.id, 1)} aria-label="Хороший ответ" title="Хороший ответ">
        <ThumbsUp className={`h-4 w-4 ${message.rating === 1 ? "fill-current" : ""}`} />
      </button>
      <button className={`${btn} ${message.rating === -1 ? on : ""}`} onClick={() => onRate?.(message.id, -1)} aria-label="Плохой ответ" title="Плохой ответ">
        <ThumbsDown className={`h-4 w-4 ${message.rating === -1 ? "fill-current" : ""}`} />
      </button>
      <button className={`${btn} ${speaking ? on : ""}`} onClick={speak} aria-label="Озвучить" title="Озвучить">
        <Volume2 className="h-4 w-4" />
      </button>
      <button className={btn} onClick={share} aria-label="Поделиться" title="Поделиться">
        <Share2 className="h-4 w-4" />
      </button>
      {isLast && (
        <button className={btn} onClick={onRegenerate} disabled={disabled} aria-label="Перегенерировать" title="Перегенерировать">
          <RefreshCw className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
