import { loadCorpus } from "@/lib/chat/corpus";
import { retrievePassages } from "@/lib/chat/retrieval";
import { generateOptionalText } from "@/lib/shared/ai";

export type ChatAnswerResult = {
  status: "ok" | "insufficient_support";
  answer: string;
  citations: Array<{ title: string; text: string; docId: string }>;
  groundedness: string;
};

export async function answerComplianceQuestion(question: string): Promise<ChatAnswerResult> {
  const docs = await loadCorpus();
  const passages = retrievePassages(question, docs);

  if (!passages.length || (passages[0]?.score ?? 0) < 2) {
    return {
      status: "insufficient_support",
      answer:
        "I do not have enough support in the bundled compliance corpus to answer that confidently.",
      citations: [],
      groundedness:
        "No relevant passages were retrieved from the local handbook corpus.",
    };
  }

  const fallbackAnswer = [
    "Based on the retrieved compliance material:",
    ...passages.slice(0, 3).map((passage) => `- ${passage.text.slice(0, 220)}...`),
  ].join("\n");

  const ai = await generateOptionalText({
    system:
      "Answer compliance questions only from the supplied passages. If they are insufficient, say so plainly. Cite the source titles in prose.",
    prompt: [
      `Question: ${question}`,
      `Passages: ${JSON.stringify(
        passages.map((passage) => ({
          title: passage.title,
          text: passage.text,
        }))
      )}`,
    ].join("\n"),
    fallback: fallbackAnswer,
  });

  return {
    status: "ok",
    answer: ai.content,
    citations: passages.map((passage) => ({
      title: passage.title,
      text: passage.text,
      docId: passage.docId,
    })),
    groundedness: ai.enabled
      ? "Answer synthesized with the configured AI provider from retrieved local passages."
      : "Answer generated from retrieved local passages without an external AI provider.",
  };
}
