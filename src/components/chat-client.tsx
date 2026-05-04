"use client";

import { useState } from "react";
import type { ChatAnswerResult } from "@/lib/chat/service";

const SUGGESTED = [
  "What are local content expectations for vendor participation in Nigerian oil and gas projects?",
  "What should a procurement team check before approving an invoice?",
  "How should a contractor document compliance for local sourcing?",
];

export function ChatClient() {
  const [question, setQuestion] = useState(SUGGESTED[0]);
  const [result, setResult] = useState<ChatAnswerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });

      const json = (await response.json()) as ChatAnswerResult | { error: string };

      if (!response.ok || "error" in json) {
        throw new Error("error" in json ? json.error : "Chat request failed.");
      }

      setResult(json);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Chat request failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Ask a compliance question</h2>
        <p className="mt-2 text-sm text-zinc-600">
          This assistant answers only from the bundled local handbook corpus and always returns the supporting passages it used.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTED.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="rounded-full border border-zinc-300 px-3 py-2 text-xs text-zinc-700 hover:border-zinc-400"
              onClick={() => setQuestion(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={5}
          className="mt-4 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm"
        />
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="mt-4 rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {loading ? "Answering..." : "Ask TrustGateAI"}
        </button>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>

      {result ? (
        <>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-zinc-900">Answer</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-700">{result.answer}</p>
            <p className="mt-4 text-xs text-zinc-500">{result.groundedness}</p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-zinc-900">Supporting passages</h3>
            <div className="mt-4 flex flex-col gap-4">
              {result.citations.length ? (
                result.citations.map((citation) => (
                  <div
                    key={`${citation.docId}-${citation.text.slice(0, 32)}`}
                    className="rounded-xl border border-zinc-200 p-4"
                  >
                    <div className="font-medium text-zinc-900">{citation.title}</div>
                    <p className="mt-2 text-sm text-zinc-600">{citation.text}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-600">No supporting passages available.</p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
