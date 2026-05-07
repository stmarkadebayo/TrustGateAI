"use client";

import { useState } from "react";
import { ProductPanel } from "@/components/product-ui";
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
      <ProductPanel>
        <h2 className="text-xl font-semibold tracking-tight text-stone-950">
          Ask a compliance question
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          This assistant answers from the bundled local handbook corpus and
          returns the supporting passages it used.
        </p>
        <div className="mt-5 grid gap-2">
          {SUGGESTED.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="border border-stone-300 bg-white px-3 py-2 text-left text-xs leading-5 text-stone-700 hover:border-emerald-800 hover:text-stone-950"
              onClick={() => setQuestion(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
        <label className="mt-5 flex flex-col gap-2 text-sm font-medium text-stone-800">
          Question
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={5}
            className="w-full rounded-md border border-stone-300 bg-white px-4 py-3 text-sm font-normal leading-6 text-stone-900"
          />
        </label>
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="mt-4 rounded-md bg-stone-950 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
        >
          {loading ? "Answering..." : "Ask TrustGateAI"}
        </button>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </ProductPanel>

      {result ? (
        <>
          <ProductPanel>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-800">
              Answer
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-stone-700">
              {result.answer}
            </p>
            <p className="mt-5 border-t border-stone-200 pt-4 text-xs leading-5 text-stone-500">
              {result.groundedness}
            </p>
          </ProductPanel>

          <ProductPanel>
            <h3 className="text-lg font-semibold tracking-tight text-stone-950">
              Supporting passages
            </h3>
            <div className="mt-4 flex flex-col gap-4">
              {result.citations.length ? (
                result.citations.map((citation) => (
                  <div
                    key={`${citation.docId}-${citation.text.slice(0, 32)}`}
                    className="border border-stone-200 bg-white p-4"
                  >
                    <div className="font-medium text-stone-950">{citation.title}</div>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{citation.text}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-stone-600">No supporting passages available.</p>
              )}
            </div>
          </ProductPanel>
        </>
      ) : null}
    </div>
  );
}
