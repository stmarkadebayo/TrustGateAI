import Link from "next/link";
import { ChatClient } from "@/components/chat-client";

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
              Chat
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-zinc-900">
              Compliance assistant
            </h1>
          </div>
          <Link href="/dashboard" className="text-sm text-zinc-600 hover:text-zinc-900">
            Back to modules
          </Link>
        </div>
        <ChatClient />
      </div>
    </div>
  );
}
