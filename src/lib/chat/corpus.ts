import fs from "node:fs/promises";
import path from "node:path";

export type CorpusDocument = {
  id: string;
  title: string;
  body: string;
};

let cachedCorpus: CorpusDocument[] | null = null;

export async function loadCorpus() {
  if (cachedCorpus) {
    return cachedCorpus;
  }

  const corpusDir = path.join(process.cwd(), "content", "compliance");
  const entries = await fs.readdir(corpusDir);
  const docs = await Promise.all(
    entries
      .filter((entry) => entry.endsWith(".md"))
      .map(async (entry) => {
        const body = await fs.readFile(path.join(corpusDir, entry), "utf8");
        return {
          id: entry,
          title: entry.replace(/\.md$/, "").replace(/-/g, " "),
          body,
        };
      })
  );

  cachedCorpus = docs;
  return docs;
}
