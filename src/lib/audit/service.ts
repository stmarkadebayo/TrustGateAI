import {
  inferAuditMapping,
  inferAuditRole,
  normalizeAuditRows,
  parseAuditFile,
} from "@/lib/audit/parser";
import { runAuditRules, scoreAuditFindings } from "@/lib/audit/rules";
import type {
  AuditAnalysisResult,
  AuditCoverageGap,
  AuditFileRole,
  AuditMode,
  AuditPackFileInput,
  AuditPackFileResult,
} from "@/lib/audit/types";
import { generateOptionalText } from "@/lib/shared/ai";
import { buildRiskBand, createExportBundle, renderFindingsSection } from "@/lib/shared/report";
import type { AnalysisFinding } from "@/lib/shared/types";

function collectCoverageGaps(roles: Set<AuditFileRole>): AuditCoverageGap[] {
  const gaps: AuditCoverageGap[] = [];

  if (!roles.has("purchase_orders")) {
    gaps.push({
      id: "missing-po-file",
      title: "Purchase order file missing",
      detail: "PO-based reconciliation and payment-versus-PO checks are partial without a purchase order file.",
    });
  }

  if (!roles.has("payments")) {
    gaps.push({
      id: "missing-payment-file",
      title: "Payment file missing",
      detail: "Settlement timing, repeated-payment, and invoice-to-payment checks were not fully available.",
    });
  }

  if (!roles.has("vendors")) {
    gaps.push({
      id: "missing-vendor-master",
      title: "Vendor master missing",
      detail: "Vendor identity normalization and concentration checks ran without master-reference support.",
    });
  }

  if (!roles.has("receipts")) {
    gaps.push({
      id: "missing-receipts",
      title: "Receipt or delivery evidence missing",
      detail: "Receipt-backed support validation and delivery coverage checks were not available.",
    });
  }

  return gaps;
}

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

function buildPackFileResult(
  input: AuditPackFileInput
): AuditPackFileResult {
  const rows = parseAuditFile(input.buffer, input.fileName);
  const headers = Object.keys(rows[0] ?? {});
  const roleInference = inferAuditRole(input.fileName, headers);
  const { mapping, confidence } = inferAuditMapping(headers, input.overrideMapping);
  const mappingNeeded = !mapping.vendor || !mapping.amount || confidence < 0.8;
  const previewRows = rows.slice(0, 5);
  const records = mappingNeeded && !input.overrideMapping ? [] : normalizeAuditRows(rows, mapping);

  return {
    role: input.role,
    suggestedRole: roleInference.role,
    roleConfidence: roleInference.confidence,
    fileName: input.fileName,
    fileType: input.fileType,
    rowCount: rows.length,
    headers,
    previewRows,
    inferredMapping: mapping,
    mappingConfidence: confidence,
    mappingNeeded,
    records,
  };
}

function buildCrossFileFindings(fileResults: AuditPackFileResult[]) {
  const findings: AnalysisFinding[] = [];
  const invoices = fileResults.filter((file) => file.role === "invoices").flatMap((file) => file.records.map((record) => ({ ...record, source: file.fileName })));
  const payments = fileResults.filter((file) => file.role === "payments").flatMap((file) => file.records.map((record) => ({ ...record, source: file.fileName })));
  const pos = fileResults.filter((file) => file.role === "purchase_orders").flatMap((file) => file.records.map((record) => ({ ...record, source: file.fileName })));
  const receipts = fileResults.filter((file) => file.role === "receipts").flatMap((file) => file.records.map((record) => ({ ...record, source: file.fileName })));

  for (const invoice of invoices) {
    const matchedPayments = payments.filter(
      (payment) =>
        payment.referenceId &&
        (payment.referenceId === invoice.transactionId ||
          payment.referenceId === invoice.referenceId)
    );

    if (!matchedPayments.length && payments.length) {
      findings.push(
        finding(
          `invoice-unpaid-${invoice.source}-${invoice.rowNumber}`,
          "medium",
          "Invoice has no linked payment record",
          "A payment file was provided, but this invoice could not be matched to a payment record.",
          [`${invoice.source} row ${invoice.rowNumber}: ${invoice.transactionId}`],
          "invoice_without_payment_match"
        )
      );
    }

    if (invoice.referenceId && pos.length) {
      const po = pos.find(
        (entry) =>
          entry.transactionId === invoice.referenceId || entry.referenceId === invoice.referenceId
      );

      if (!po) {
        findings.push(
          finding(
            `invoice-po-missing-${invoice.source}-${invoice.rowNumber}`,
            "medium",
            "Invoice references missing PO",
            "The invoice references a PO or contract id that is not present in the uploaded purchase order data.",
            [`${invoice.source} row ${invoice.rowNumber}: reference=${invoice.referenceId}`],
            "invoice_missing_po_match"
          )
        );
      } else if (
        invoice.amount !== null &&
        po.amount !== null &&
        invoice.amount > po.amount
      ) {
        findings.push(
          finding(
            `invoice-po-over-${invoice.source}-${invoice.rowNumber}`,
            "high",
            "Invoice exceeds referenced PO amount",
            "The invoice amount is larger than the matched PO amount in the uploaded records.",
            [
              `${invoice.source} row ${invoice.rowNumber}: invoice=${invoice.amount}`,
              `${po.source} row ${po.rowNumber}: po=${po.amount}`,
            ],
            "invoice_exceeds_po_amount"
          )
        );
      }
    }
  }

  for (const payment of payments) {
    const invoice = invoices.find(
      (entry) =>
        entry.transactionId === payment.referenceId ||
        entry.referenceId === payment.referenceId
    );

    if (!invoice && invoices.length) {
      findings.push(
        finding(
          `payment-invoice-missing-${payment.source}-${payment.rowNumber}`,
          "medium",
          "Payment has no linked invoice record",
          "A payment file was uploaded but this payment could not be matched to an invoice in the review pack.",
          [`${payment.source} row ${payment.rowNumber}: reference=${payment.referenceId ?? "none"}`],
          "payment_missing_invoice_match"
        )
      );
    }

    if (
      invoice &&
      payment.amount !== null &&
      invoice.amount !== null &&
      payment.amount > invoice.amount
    ) {
      findings.push(
        finding(
          `payment-over-invoice-${payment.source}-${payment.rowNumber}`,
          "high",
          "Payment exceeds invoice amount",
          "The payment amount is larger than the matched invoice amount.",
          [
            `${payment.source} row ${payment.rowNumber}: payment=${payment.amount}`,
            `${invoice.source} row ${invoice.rowNumber}: invoice=${invoice.amount}`,
          ],
          "payment_exceeds_invoice_amount"
        )
      );
    }
  }

  if (payments.length && receipts.length) {
    for (const payment of payments) {
      const receipt = receipts.find(
        (entry) =>
          entry.referenceId === payment.referenceId ||
          entry.transactionId === payment.referenceId ||
          entry.receiptId === payment.receiptId
      );

      if (!receipt) {
        findings.push(
          finding(
            `payment-receipt-missing-${payment.source}-${payment.rowNumber}`,
            "low",
            "Payment has no linked receipt or delivery evidence",
            "Receipt or delivery files were uploaded, but this payment could not be matched to support evidence.",
            [`${payment.source} row ${payment.rowNumber}`],
            "payment_missing_receipt_match"
          )
        );
      }
    }
  }

  return findings;
}

function buildRoleInferenceFindings(fileResults: AuditPackFileResult[]) {
  return fileResults
    .filter(
      (file) => file.role !== file.suggestedRole && file.roleConfidence >= 0.8
    )
    .map((file) =>
      finding(
        `role-mismatch-${file.fileName}`,
        "low",
        "Uploaded file role may be mismatched",
        "The selected audit role does not match the file's strongest filename/header signals.",
        [
          `${file.fileName}: selected=${file.role}`,
          `${file.fileName}: suggested=${file.suggestedRole}`,
        ],
        "audit_role_inference_mismatch"
      )
    );
}

function combineMappings(files: AuditPackFileResult[]) {
  return files.some((file) => file.mappingNeeded);
}

function buildMappingResponse(
  fileResults: AuditPackFileResult[]
): AuditAnalysisResult {
  const payload = fileResults.map((file) => ({
    role: file.role,
    fileName: file.fileName,
    headers: file.headers,
    inferredMapping: file.inferredMapping,
    mappingConfidence: file.mappingConfidence,
    previewRows: file.previewRows,
  }));

  return {
    status: "needs_mapping",
    summary: {
      title: "One or more files need mapping confirmation",
      detail:
        "TrustGateAI inferred likely columns for the review pack, but at least one file needs mapping confirmation before pack-level audit analysis can run safely.",
      status: "needs_mapping",
    },
    findings: [],
    aiNotes: {
      enabled: false,
      mode: "fallback",
      content:
        "Confirm the key columns for each flagged file, then rerun the audit pack analysis.",
    },
    limitations: [
      "Cross-file audit rules do not run until required vendor and amount mappings are confirmed for all pack files.",
    ],
    exports: createExportBundle("Audit pack mapping request", payload, [
      "## Summary",
      "At least one audit pack file needs mapping confirmation before analysis can run.",
    ]),
    fileResults,
    riskScore: 0,
    riskBand: "low",
    coverageGaps: [],
  };
}

export async function analyzeAuditPack(args: {
  files: AuditPackFileInput[];
  mode: AuditMode;
}): Promise<AuditAnalysisResult> {
  const fileResults = args.files.map(buildPackFileResult);

  if (combineMappings(fileResults)) {
    return buildMappingResponse(fileResults);
  }

  const roles = new Set(fileResults.map((file) => file.role));
  const coverageGaps = collectCoverageGaps(roles);
  const singleFileFindings = fileResults.flatMap((file) => runAuditRules(file.records));
  const crossFileFindings = buildCrossFileFindings(fileResults);
  const roleInferenceFindings = buildRoleInferenceFindings(fileResults);
  const findings = [...singleFileFindings, ...crossFileFindings, ...roleInferenceFindings];
  const totalRecords = fileResults.reduce((sum, file) => sum + file.records.length, 0);
  const riskScore = scoreAuditFindings(findings);
  const riskBand = buildRiskBand(riskScore);

  const fallbackSummary = findings.length
    ? `Analyzed ${fileResults.length} files and ${totalRecords} normalized records. ${findings.length} findings were generated, with ${coverageGaps.length} coverage gaps noted.`
    : `Analyzed ${fileResults.length} files and ${totalRecords} normalized records with no triggered rule-based findings. ${coverageGaps.length} coverage gaps were still noted.`;

  const ai = await generateOptionalText({
    system:
      "You are a conservative audit analyst. Explain deterministic pack-level fraud findings without overstating certainty. Never claim fraud as fact.",
    prompt: [
      `Audit mode: ${args.mode}`,
      `Risk score: ${riskScore}`,
      `Risk band: ${riskBand}`,
      `Files: ${JSON.stringify(fileResults.map((file) => ({ role: file.role, fileName: file.fileName, rowCount: file.rowCount })))}`,
      `Coverage gaps: ${JSON.stringify(coverageGaps)}`,
      `Findings: ${JSON.stringify(findings.slice(0, 16))}`,
    ].join("\n"),
    fallback: fallbackSummary,
  });

  const payload = {
    mode: args.mode,
    files: fileResults.map((file) => ({
      role: file.role,
      fileName: file.fileName,
      rowCount: file.rowCount,
      headers: file.headers,
      inferredMapping: file.inferredMapping,
      mappingConfidence: file.mappingConfidence,
    })),
    coverageGaps,
    findings,
    riskScore,
    riskBand,
    aiNotes: ai.content,
  };

  return {
    status: "ok",
    summary: {
      title: "Audit pack analysis complete",
      detail: `Analyzed ${fileResults.length} files across a ${riskBand} risk profile with ${coverageGaps.length} coverage gaps.`,
      riskBand,
      status: "ok",
    },
    findings,
    aiNotes: ai,
    limitations: [
      "Audit outputs are advisory and based on deterministic heuristics plus optional AI explanation.",
      "Coverage gaps reduce the strength of cross-file reconciliation.",
    ],
    exports: createExportBundle("Audit pack report", payload, [
      "## Summary",
      fallbackSummary,
      "## Coverage Gaps",
      coverageGaps.length
        ? coverageGaps.map((gap) => `- ${gap.title}: ${gap.detail}`).join("\n")
        : "- No coverage gaps detected.",
      renderFindingsSection(findings),
      "## Limitations",
      "- Deterministic rules do not prove fraud.",
      "- AI notes are explanatory only.",
    ]),
    fileResults,
    riskScore,
    riskBand,
    coverageGaps,
  };
}
