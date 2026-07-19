import { createFileRoute } from "@tanstack/react-router";
import ChatPage from "@/components/ChatPage";

export const Route = createFileRoute("/c/$threadId")({
  component: RouteComponent,
  ssr: false,
});

function RouteComponent() {
  const { threadId } = Route.useParams();
  return <ChatPage threadId={threadId} />;
}