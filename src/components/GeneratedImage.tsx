import { useState } from "react";
import { Download } from "lucide-react";

const WATERMARK = "ApexCode";

async function withWatermark(src: string): Promise<string> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("load"));
    img.src = src;
  });
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;
  ctx.drawImage(img, 0, 0);

  const pad = Math.round(canvas.width * 0.025);
  const size = Math.max(14, Math.round(canvas.width * 0.035));
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = size * 0.4;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(WATERMARK, canvas.width - pad, canvas.height - pad);
  return canvas.toDataURL("image/png");
}

export default function GeneratedImage({ src, alt }: { src: string; alt: string }) {
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const url = await withWatermark(src).catch(() => src);
      const a = document.createElement("a");
      a.href = url;
      a.download = `apexcode-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="relative inline-block max-w-full my-2 group">
      <img src={src} alt={alt} className="max-w-full rounded-2xl border border-border" />
      <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-background/45 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium tracking-wide text-foreground/90">
        {WATERMARK}
      </span>
      <button
        onClick={download}
        disabled={busy}
        className="absolute top-2 right-2 inline-flex items-center gap-1.5 rounded-full bg-background/70 backdrop-blur-sm border border-border px-2.5 py-1.5 text-[11px] font-medium hover:bg-accent disabled:opacity-50"
        aria-label="Скачать изображение"
      >
        <Download className="h-3.5 w-3.5" />
        {busy ? "…" : "Скачать"}
      </button>
    </span>
  );
}
