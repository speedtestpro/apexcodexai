import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { loadActiveId, loadThreads, newThread, saveActiveId, saveThreads } from "@/lib/storage";

export const Route = createFileRoute("/")({
  component: Index,
  ssr: false,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    const threads = loadThreads();
    const activeId = loadActiveId();
    let target = activeId && threads.find((t) => t.id === activeId)?.id;
    if (!target) target = threads[0]?.id;
    if (!target) {
      const t = newThread();
      saveThreads([t]);
      saveActiveId(t.id);
      target = t.id;
    }
    navigate({ to: "/c/$threadId", params: { threadId: target }, replace: true });
  }, [navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      <div className="h-16 w-16 rounded-full apex-orb animate-pulse" />
    </div>
  );
}
