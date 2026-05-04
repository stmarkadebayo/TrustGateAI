import { generateOptionalText } from "@/lib/shared/ai";
import { createExportBundle, renderFindingsSection } from "@/lib/shared/report";
import type { AnalysisFinding } from "@/lib/shared/types";
import { detectDocumentType, extractDocumentText, extractFields } from "@/lib/verify/extract";
import { buildCoverageGaps, getPack } from "@/lib/verify/packs";
import { applyValidatorProfiles, getValidatorProfiles } from "@/lib/verify/profiles";
import { registryLookupAdapter } from "@/lib/verify/registry";
import type {
  VerificationBundleFile,
  VerificationResult,
  VerifyCountry,
  VerifyDocType,
  VerifySubmissionType,
} from "@/lib/verify/types";

function finding(
  id: string,
  severity: "low" | "medium" | "high",
  title: string,
  detail: string,
  evidence: string[],
  ruleId: string
): AnalysisFinding {
  return { id, severity, title, detail, evidence, ruleId };
}

async function analyzeBundleFile(args: {
  file: File;
  buffer: Buffer;
  preferredDocType: VerifyDocType;
  country: VerifyCountry;
  submissionType: VerifySubmissionType;
}): Promise<{
  fileResult: VerificationBundleFile;
  findings: AnalysisFinding[];
}> {
  const extraction = await extractDocumentText(args.file, args.buffer);
  const detectedDocType = detectDocumentType(extraction.text, args.preferredDocType);
  const fields = extractFields(extraction.text, detectedDocType);
  const validatorProfiles = getValidatorProfiles({
    country: args.country,
    submissionType: args.submissionType,
    docType: detectedDocType,
  });
  const findings: AnalysisFinding[] = [];
  const identifiers = fields
    .filter((field) => /id|certificate|invoice|registration/i.test(field.key))
    .map((field) => field.value);

  if (!extraction.text) {
    findings.push(
      finding(
        `ocr-empty-${args.file.name}`,
        "high",
        "No readable text extracted",
        "The file could not be converted into usable text for verification.",
        [args.file.name],
        "no_text_extracted"
      )
    );
  }

  if (extraction.text.length > 0 && extraction.text.length < 120) {
    findings.push(
      finding(
        `low-yield-${args.file.name}`,
        "medium",
        "Low OCR yield",
        "Very little text was extracted, so verification coverage is limited.",
        [`${args.file.name}: extracted characters=${extraction.text.length}`],
        "low_ocr_yield"
      )
    );
  }

  const requiredFields: Record<string, string[]> = {
    invoice: ["invoiceId", "documentDate", "amount"],
    certificate: ["certificateId", "documentDate"],
    letter: ["documentDate", "organization"],
    tax_form: ["documentDate", "organization"],
    insurance: ["documentDate", "organization"],
    registration: ["documentDate", "organization"],
  };

  for (const key of requiredFields[detectedDocType] ?? []) {
    if (!fields.find((field) => field.key === key)) {
      findings.push(
        finding(
          `missing-${key}-${args.file.name}`,
          "medium",
          "Missing expected field",
          `The ${detectedDocType} parser did not find the expected ${key} field.`,
          [`${args.file.name}: document type=${detectedDocType}`],
          "missing_required_field"
        )
      );
    }
  }

  const normalizedText = extraction.text.toLowerCase();
  if (/xxxxx|lorem ipsum|sample/i.test(normalizedText)) {
    findings.push(
      finding(
        `placeholder-${args.file.name}`,
        "low",
        "Placeholder or sample text detected",
        "The document contains placeholder patterns that weaken verification confidence.",
        [args.file.name],
        "placeholder_text"
      )
    );
  }

  const registryResult = await registryLookupAdapter.lookup({
    country: args.country,
    docType: detectedDocType,
    profiles: validatorProfiles,
    identifiers,
    fields,
  });

  if (!registryResult.configured) {
    findings.push(
      finding(
        `registry-unavailable-${args.file.name}`,
        "low",
        "Registry validation unavailable",
        registryResult.detail,
        [args.file.name],
        "registry_unavailable"
      )
    );
  } else if (registryResult.status === "no_match") {
    findings.push(
      finding(
        `registry-no-match-${args.file.name}`,
        "high",
        "Registry lookup did not match",
        registryResult.detail,
        [registryResult.source ?? args.file.name],
        "registry_no_match"
      )
    );
  } else if (registryResult.status === "inconclusive") {
    findings.push(
      finding(
        `registry-inconclusive-${args.file.name}`,
        "medium",
        "Registry lookup inconclusive",
        registryResult.detail,
        [registryResult.source ?? args.file.name],
        "registry_inconclusive"
      )
    );
  }

  findings.push(
    ...applyValidatorProfiles({
      profiles: validatorProfiles,
      fileName: args.file.name,
      text: extraction.text,
      fields,
    })
  );

  return {
    fileResult: {
      fileName: args.file.name,
      fileType: args.file.type || "unknown",
      size: args.file.size,
      pageCount: extraction.pageCount,
      detectedDocType,
      validatorProfiles,
      extractedText: extraction.text,
      extractedFields: fields,
      registryResult,
    },
    findings,
  };
}

function buildBundleConsistencyFindings(
  fileResults: VerificationBundleFile[],
  consistencyKeys: string[]
) {
  const findings: AnalysisFinding[] = [];

  for (const key of consistencyKeys) {
    const values = fileResults.flatMap((file) =>
      file.extractedFields
        .filter((field) => field.key === key)
        .map((field) => ({ fileName: file.fileName, value: field.value }))
    );

    if (values.length > 1) {
      const distinct = new Set(values.map((entry) => entry.value.toLowerCase()));
      if (distinct.size > 1) {
        findings.push(
          finding(
            `bundle-${key}-mismatch`,
            key === "amount" ? "medium" : "high",
            `${key} conflicts across the bundle`,
            `Different ${key} values were extracted across supporting documents in the same packet.`,
            values.map((entry) => `${entry.fileName}: ${entry.value}`),
            `bundle_${key}_mismatch`
          )
        );
      }
    }
  }

  return findings;
}

export async function analyzeVerificationBundle(args: {
  files: Array<{ file: File; buffer: Buffer; preferredDocType: VerifyDocType }>;
  country: VerifyCountry;
  submissionType: VerifySubmissionType;
}): Promise<VerificationResult> {
  const analyzed = await Promise.all(
    args.files.map((file) =>
      analyzeBundleFile({
        ...file,
        country: args.country,
        submissionType: args.submissionType,
      })
    )
  );

  const fileResults = analyzed.map((item) => item.fileResult);
  const findings = analyzed.flatMap((item) => item.findings);
  findings.push(
    ...buildBundleConsistencyFindings(
      fileResults,
      getPack(args.country).submissions[args.submissionType].consistencyKeys
    )
  );

  const pack = getPack(args.country);
  const submission = pack.submissions[args.submissionType];
  const presentTypes = new Set(fileResults.map((file) => file.detectedDocType));
  const missingDocuments = submission.requiredDocTypes
    .filter((type) => !presentTypes.has(type))
    .map((type) => pack.docs[type]);
  const coverageGaps = buildCoverageGaps(args.country, args.submissionType, missingDocuments);

  const highCount = findings.filter((item) => item.severity === "high").length;
  const mediumCount = findings.filter((item) => item.severity === "medium").length;
  const status =
    highCount > 0 ? "fail" : mediumCount > 2 || missingDocuments.length > 0 ? "review" : "pass";

  const fallbackSummary =
    status === "pass"
      ? `The ${pack.label} ${submission.label.toLowerCase()} passed the current bundle checks with no high-risk contradictions detected.`
      : `The ${pack.label} ${submission.label.toLowerCase()} requires manual review based on bundle findings, registry results, or missing expected supporting documents.`;

  const ai = await generateOptionalText({
    system:
      "You are a cautious compliance verifier. Summarize bundle-level document integrity findings without claiming legal authenticity.",
    prompt: [
      `Country: ${args.country}`,
      `Submission type: ${args.submissionType}`,
      `Status: ${status}`,
      `Files: ${JSON.stringify(fileResults.map((file) => ({
        name: file.fileName,
        type: file.detectedDocType,
        fields: file.extractedFields,
      })))}`,
      `Missing documents: ${JSON.stringify(missingDocuments)}`,
      `Findings: ${JSON.stringify(findings)}`,
    ].join("\n"),
    fallback: fallbackSummary,
  });

  const payload = {
    country: args.country,
    submissionType: args.submissionType,
    files: fileResults.map((file) => ({
      fileName: file.fileName,
      detectedDocType: file.detectedDocType,
      extractedFields: file.extractedFields,
      registryResult: file.registryResult,
    })),
    missingDocuments,
    coverageGaps,
    findings,
    aiNotes: ai.content,
    status,
  };

  return {
    status,
    summary: {
      title: "Verification bundle complete",
      detail: fallbackSummary,
      status,
    },
    findings,
    aiNotes: ai,
    limitations: [
      "This verifier surfaces integrity signals and bundle consistency issues; it does not guarantee legal authenticity.",
      "Country packs define review expectations, not legal determinations.",
    ],
    exports: createExportBundle("Verification bundle report", payload, [
      "## Summary",
      fallbackSummary,
      "## Missing Documents",
      missingDocuments.length ? missingDocuments.map((item) => `- ${item}`).join("\n") : "- No expected documents missing.",
      "## Coverage Gaps",
      coverageGaps.length ? coverageGaps.map((gap) => `- ${gap.title}: ${gap.detail}`).join("\n") : "- No coverage gaps detected.",
      renderFindingsSection(findings),
    ]),
    country: args.country,
    submissionType: args.submissionType,
    fileResults,
    missingDocuments,
    coverageGaps,
  };
}
