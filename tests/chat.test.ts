import { describe, expect, it } from "vitest";
import { retrievePassages } from "../src/lib/chat/retrieval";

describe("chat retrieval", () => {
  it("retrieves passages with overlapping procurement terms", () => {
    const passages = retrievePassages("What procurement controls check duplicate invoices?", [
      {
        id: "procurement-controls.md",
        title: "procurement controls",
        body: "Duplicate invoices and split payments should be checked before approval.",
      },
    ]);

    expect(passages.length).toBe(1);
    expect(passages[0].title).toContain("procurement");
  });
});
