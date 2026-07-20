import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/lib/storage";
import { Download, FileText, Globe } from "lucide-react";
import { extractProjectFiles, downloadZip } from "@/lib/projectParser";

export default function MessageList({ messages, streamingText, userName, streaming, webSearching }: { messages: ChatMessage[]; streamingText: string; userName: string; streaming?: boolean; webSearching?: boolean }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingText, streaming]);

  const showPlaceholder = streaming && !streamingText;

  return (
    <div className="mx-auto max-w-2xl px-3 py-4 flex flex-col gap-5">
      {messages.map((m) => <Bubble key={m.id} message={m} userName={userName} />)}
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

function Bubble({ message, userName, streaming }: { message: ChatMessage; userName: string; streaming?: boolean }) {
  const isUser = message.role === "user";
  const files = message.role === "assistant" ? extractProjectFiles(message.content) : [];

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
          <div className={
            isUser
              ? "rounded-2xl px-4 py-2.5 bg-secondary text-foreground whitespace-pre-wrap break-words"
              : "prose-apex text-foreground max-w-full break-words"
          }>
            {isUser ? (
              <span>{message.content}</span>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || (streaming ? "…" : "")}</ReactMarkdown>
            )}
          </div>
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