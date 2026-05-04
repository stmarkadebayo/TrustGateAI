import { NextResponse } from "next/server";
import { analyzeVerificationBundle } from "@/lib/verify/service";
import type { VerifyCountry, VerifyDocType, VerifySubmissionType } from "@/lib/verify/types";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files");
    const docTypes = formData.getAll("docTypes");
    const country = (formData.get("country") as VerifyCountry | null) ?? "nigeria";
    const submissionType =
      (formData.get("submissionType") as VerifySubmissionType | null) ??
      "generic_packet";

    const bundleFiles = await Promise.all(
      files.map(async (entry, index) => {
        if (!(entry instanceof File)) {
          throw new Error("One or more uploaded verification files were invalid.");
        }

        return {
          file: entry,
          buffer: Buffer.from(await entry.arrayBuffer()),
          preferredDocType: (docTypes[index] as VerifyDocType | undefined) ?? "auto",
        };
      })
    );

    if (!bundleFiles.length) {
      return NextResponse.json({ error: "No files uploaded." }, { status: 400 });
    }

    const result = await analyzeVerificationBundle({
      files: bundleFiles,
      country,
      submissionType,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Verification failed unexpectedly.",
      },
      { status: 500 }
    );
  }
}
