import { useRef, useState } from "react";
import { Plus, ArrowUp, Square, X, Image as ImageIcon, FileText, Mic, Globe, Brain } from "lucide-react";
import type { ChatFileAttachment } from "@/lib/storage";

type Props = {
  disabled: boolean;
  supportsFiles: boolean;
  supportsVision?: boolean;
  supportsWebSearch?: boolean;
  webSearch?: boolean;
  onToggleWebSearch?: (v: boolean) => void;
  deepThink?: boolean;
  onToggleDeepThink?: (v: boolean) => void;
  onSend: (text: string, attachments: ChatFileAttachment[]) => void;
  onStop: () => void;
  streaming: boolean;
};

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result ?? ""));
    fr.onerror = () => reject(fr.error ?? new Error("read error"));
    fr.readAsDataURL(file);
  });
}

function guessMime(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
    gif: "image/gif", heic: "image/heic", heif: "image/heif", pdf: "application/pdf",
  };
  return map[ext] ?? "application/octet-stream";
}

async function fileToAttachment(file: File): Promise<ChatFileAttachment> {
  const mimeType = guessMime(file);
  let dataUrl = await readAsDataUrl(file);
  if (!file.type && dataUrl.startsWith("data:application/octet-stream")) {
    dataUrl = `data:${mimeType};base64,${dataUrl.split(",")[1] ?? ""}`;
  }
  return {
    name: file.name,
    mimeType,
    dataUrl,
    kind: mimeType.startsWith("image/") ? "image" : "file",
  };
}

export default function Composer({ disabled, supportsFiles, supportsVision, supportsWebSearch, webSearch, onToggleWebSearch, deepThink, onToggleDeepThink, onSend, onStop, streaming }: Props) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<ChatFileAttachment[]>([]);
  const [hint, setHint] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  async function onPickFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const converted: ChatFileAttachment[] = [];
    const problems: string[] = [];
    for (const f of Array.from(files)) {
      const mime = guessMime(f);
      if (f.size > 8 * 1024 * 1024) {
        problems.push(`«${f.name}» больше 8 МБ`);
        continue;
      }
      if (mime.startsWith("image/") && !supportsVision) {
        problems.push("эта модель не умеет смотреть фото — выберите модель с меткой «Смотрит фото»");
        continue;
      }
      try {
        converted.push(await fileToAttachment(f));
      } catch {
        problems.push(`не удалось прочитать «${f.name}»`);
      }
    }
    if (converted.length) setAttachments((prev) => [...prev, ...converted]);
    setHint(problems.length ? problems.join("; ") : null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function submit() {
    const t = text.trim();
    if (!t && attachments.length === 0) return;
    onSend(t, attachments);
    setText("");
    setAttachments([]);
    requestAnimationFrame(() => taRef.current?.focus());
  }

  return (
    <div className="apex-glass rounded-3xl overflow-hidden">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 pb-0">
          {attachments.map((a, i) => (
            <div key={i} className="relative flex items-center gap-2 rounded-lg bg-accent pr-2 pl-1 py-1 text-xs">
              {a.kind === "image" ? (
                <img src={a.dataUrl} alt={a.name} className="h-10 w-10 rounded-md object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                  <FileText className="h-4 w-4" />
                </div>
              )}
              <span className="max-w-[120px] truncate">{a.name}</span>
              <button
                onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                className="ml-1 h-5 w-5 rounded-full bg-background/60 hover:bg-destructive/40 flex items-center justify-center"
                aria-label="Убрать"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {hint && (
        <div className="px-3 pt-2 text-[11px] text-muted-foreground">{hint}</div>
      )}
      <div className="flex items-end gap-1 p-2">
        {supportsFiles && (
          <button
            onClick={() => fileRef.current?.click()}
            className="h-10 w-10 shrink-0 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground"
            aria-label="Прикрепить"
          >
            <Plus className="h-5 w-5" />
          </button>
        )}
        {supportsWebSearch && (
          <button
            onClick={() => onToggleWebSearch?.(!webSearch)}
            className={`h-10 shrink-0 rounded-full flex items-center gap-1.5 px-3 text-xs font-medium transition ${
              webSearch
                ? "bg-primary/15 text-primary border border-primary/40"
                : "hover:bg-accent text-muted-foreground border border-transparent"
            }`}
            aria-pressed={!!webSearch}
            aria-label="Веб-поиск"
            title="Веб-поиск"
          >
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Поиск</span>
          </button>
        )}
        <button
          onClick={() => onToggleDeepThink?.(!deepThink)}
          className={`h-10 shrink-0 rounded-full flex items-center gap-1.5 px-3 text-xs font-medium transition ${
            deepThink
              ? "bg-primary/15 text-primary border border-primary/40 apex-deepthink-active"
              : "hover:bg-accent text-muted-foreground border border-transparent"
          }`}
          aria-pressed={!!deepThink}
          aria-label="Глубокое раздумие"
          title="Глубокое раздумие"
        >
          <Brain className="h-4 w-4" />
          <span className="hidden sm:inline">Раздумие</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          accept={`${supportsVision ? "image/*," : ""}.pdf,.txt,.md,.json,.csv,.js,.ts,.tsx,.py,.doc,.docx`}
          onChange={(e) => onPickFiles(e.target.files)}
        />
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
          }}
          placeholder="Спросить ApexCode"
          rows={1}
          className="flex-1 bg-transparent resize-none outline-none py-2.5 px-1 max-h-40 text-[15px] placeholder:text-muted-foreground"
        />
        {streaming ? (
          <button
            onClick={onStop}
            className="h-10 w-10 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
            aria-label="Остановить"
          >
            <Square className="h-4 w-4 fill-current" />
          </button>
        ) : text.trim() || attachments.length ? (
          <button
            onClick={submit}
            disabled={disabled}
            className="h-10 w-10 shrink-0 rounded-full bg-primary text-primary-foreground disabled:opacity-40 flex items-center justify-center"
            aria-label="Отправить"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        ) : (
          <button
            className="h-10 w-10 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-80"
            aria-label="Голос"
            title="Голосовой ввод (скоро)"
          >
            <Mic className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}

void ImageIcon;