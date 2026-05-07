import { ToolPage } from "@/components/app-shell";
import { ChatClient } from "@/components/chat-client";

export default function ChatPage() {
  return (
    <ToolPage
      label="Chat"
      title="Ask compliance questions with cited answers."
      description="Ask a question and get a grounded answer from the local compliance corpus. Supporting passages stay visible so the answer can be checked."
    >
      <ChatClient />
    </ToolPage>
  );
}
