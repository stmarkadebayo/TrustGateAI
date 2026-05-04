import type { CorpusDocument } from "@/lib/chat/corpus";

export type RetrievedPassage = {
  docId: string;
  title: string;
  text: string;
  score: number;
};

function tokenize(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function countOccurrences(tokens: string[], queryToken: string) {
  return tokens.reduce((count, token) => count + (token === queryToken ? 1 : 0), 0);
}

export function chunkDocument(doc: CorpusDocument) {
  return doc.body
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((text, index) => ({
      id: `${doc.id}:${index}`,
      docId: doc.id,
      title: doc.title,
      text,
    }));
}

export function retrievePassages(query: string, docs: CorpusDocument[], limit = 4): RetrievedPassage[] {
  const queryTokens = tokenize(query);
  const chunks = docs.flatMap(chunkDocument);
  const normalizedQuery = query.toLowerCase();

  return chunks
    .map((chunk) => {
      const chunkTokens = tokenize(chunk.text);
      const titleTokens = tokenize(chunk.title);
      const score = queryTokens.reduce((total, token) => {
        const bodyHits = countOccurrences(chunkTokens, token);
        const titleHits = countOccurrences(titleTokens, token);
        return total + bodyHits + titleHits * 2;
      }, 0);
      return { ...chunk, score };
    })
    .map((chunk) => ({ ...chunk, score: chunk.score + (chunk.text.toLowerCase().includes(normalizedQuery) ? 3 : 0) }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
