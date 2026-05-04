import { NextResponse } from "next/server";
import { answerComplianceQuestion } from "@/lib/chat/service";

export async function POST(request: Request) {
  try {
    const json = (await request.json()) as { question?: string };

    if (!json.question?.trim()) {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }

    const result = await answerComplianceQuestion(json.question);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Chat request failed unexpectedly.",
      },
      { status: 500 }
    );
  }
}
