// Extracts project files from assistant markdown output.
// Convention we instruct the model to use:
//   ```lang path=relative/path/file.ext
//   ...content...
//   ```
// We also fall back to fenced blocks with a leading comment: // file: relative/path

export type ProjectFile = { path: string; content: string; lang?: string };

export function extractProjectFiles(markdown: string): ProjectFile[] {
  const files: ProjectFile[] = [];
  const fenceRe = /```([a-zA-Z0-9_+-]*)([^\n]*)\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(markdown)) !== null) {
    const lang = m[1] || undefined;
    const meta = (m[2] || "").trim();
    let content = m[3];
    let path: string | null = null;

    // path=xxx in fence meta
    const pathAttr = meta.match(/path=([^\s]+)/);
    if (pathAttr) path = pathAttr[1].replace(/^["']|["']$/g, "");

    // leading comment fallback: // file: xxx  OR  # file: xxx  OR  <!-- file: xxx -->
    if (!path) {
      const lines = content.split("\n");
      const first = lines[0]?.trim() ?? "";
      const commentMatch = first.match(/^(?:\/\/|#|<!--)\s*file:\s*([^\s>]+)/i);
      if (commentMatch) {
        path = commentMatch[1];
        content = lines.slice(1).join("\n");
      }
    }

    if (path) {
      files.push({ path: path.replace(/^\/+/, ""), content: content.replace(/\n$/, ""), lang });
    }
  }
  return files;
}

export async function downloadZip(name: string, files: ProjectFile[]) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const f of files) {
    zip.file(f.path, f.content);
  }
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name || "apexcode-project"}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}