"use client";

import { useState } from "react";
import { DownloadButtons } from "@/components/download-buttons";
import {
  InlineBadge,
  ProductPanel,
  StatusBadge,
  UploadDropzone,
  formatFileSize,
} from "@/components/product-ui";
import type {
  AuditAnalysisResult,
  AuditFileRole,
  AuditMapping,
  AuditMode,
} from "@/lib/audit/types";

const DEFAULT_MODE: AuditMode = "general";

type AuditUploadItem = {
  file: File;
  role: AuditFileRole;
};

const AUDIT_ROLES: AuditFileRole[] = [
  "invoices",
  "payments",
  "purchase_orders",
  "vendors",
  "receipts",
];

function guessRoleFromFileName(fileName: string): AuditFileRole {
  const lower = fileName.toLowerCase();
  if (lower.includes("payment") || lower.includes("remittance")) {
    return "payments";
  }
  if (lower.includes("po") || lower.includes("purchase") || lower.includes("contract")) {
    return "purchase_orders";
  }
  if (lower.includes("vendor") || lower.includes("supplier")) {
    return "vendors";
  }
  if (lower.includes("receipt") || lower.includes("delivery") || lower.includes("grn")) {
    return "receipts";
  }
  return "invoices";
}

export function AuditClient() {
  const [files, setFiles] = useState<AuditUploadItem[]>([]);
  const [mode, setMode] = useState<AuditMode>(DEFAULT_MODE);
  const [result, setResult] = useState<AuditAnalysisResult | null>(null);
  const [mappingOverride, setMappingOverride] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addFiles(selected: FileList | null) {
    if (!selected?.length) {
      return;
    }

    setFiles((current) => [
      ...current,
      ...Array.from(selected).map((file) => ({
        file,
        role: guessRoleFromFileName(file.name),
      })),
    ]);
  }

  async function submitAudit(overrides?: Record<string, AuditMapping>) {
    if (!files.length) {
      setError("Choose one or more files before running the audit.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("mode", mode);

      files.forEach((item) => {
        formData.append("files", item.file);
        formData.append("roles", item.role);
        formData.append(
          "mappings",
          JSON.stringify(overrides?.[item.file.name] ?? {})
        );
      });

      const response = await fetch("/api/audit", {
        method: "POST",
        body: formData,
      });

      const json = (await response.json()) as AuditAnalysisResult | { error: string };

      if (!response.ok || "error" in json) {
        throw new Error("error" in json ? json.error : "Audit request failed.");
      }

      setResult(json);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Audit request failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ProductPanel>
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-stone-950">
              Upload audit review pack
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Add one file for a quick scan or multiple files for reconciliation
              across invoices, payments, purchase orders, vendors, and receipts.
            </p>
          </div>

          <UploadDropzone
            id="audit-files"
            label="Upload files"
            title="Drop audit files here"
            description="CSV, XLSX, XLS, or JSON. You can select multiple files at once."
            accept=".csv,.json,.xlsx,.xls"
            onFiles={addFiles}
          />

          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as AuditMode)}
            className="w-full rounded-md border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900"
          >
            <option value="general">General anomaly scan</option>
            <option value="procurement">Procurement audit</option>
            <option value="payments">Payments audit</option>
          </select>

          {files.length ? (
            <div className="grid gap-3">
              {files.map((item, index) => (
                <div
                  key={`${item.file.name}-${index}`}
                  className="grid gap-3 border border-stone-200 bg-white p-4 md:grid-cols-[1fr_190px]"
                >
                  <div>
                    <div className="font-medium text-stone-950">{item.file.name}</div>
                    <div className="text-sm text-stone-500">
                      {item.file.type || "unknown type"} · {formatFileSize(item.file.size)}
                    </div>
                  </div>
                  <select
                    value={item.role}
                    onChange={(event) =>
                      setFiles((current) =>
                        current.map((entry, entryIndex) =>
                          entryIndex === index
                            ? { ...entry, role: event.target.value as AuditFileRole }
                            : entry
                        )
                      )
                    }
                    className="rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900"
                  >
                    {AUDIT_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => submitAudit()}
            disabled={loading}
            className="rounded-md bg-stone-950 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
          >
            {loading ? "Running audit..." : "Run audit pack"}
          </button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </ProductPanel>

      {result?.status === "needs_mapping" ? (
        <div className="border border-amber-300 bg-amber-50 p-5 shadow-sm sm:p-6">
          <h3 className="text-lg font-semibold tracking-tight text-amber-950">
            Confirm key columns
          </h3>
          <div className="mt-4 flex flex-col gap-6">
            {result.fileResults
              .filter((file) => file.mappingNeeded)
              .map((file) => (
                <div key={file.fileName} className="border border-amber-200 bg-white p-4">
                  <div className="font-medium text-stone-950">{file.fileName}</div>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    {(["transactionId", "vendor", "amount", "invoiceDate", "paymentDate", "referenceId"] as const).map(
                      (field) => (
                        <label key={field} className="flex flex-col gap-2 text-sm text-stone-800">
                          <span className="font-medium">{field}</span>
                          <select
                            value={
                              mappingOverride[file.fileName]?.[field] ??
                              file.inferredMapping[field] ??
                              ""
                            }
                            onChange={(event) =>
                              setMappingOverride((current) => ({
                                ...current,
                                [file.fileName]: {
                                  ...current[file.fileName],
                                  [field]: event.target.value,
                                },
                              }))
                            }
                            className="rounded-md border border-stone-300 px-3 py-2"
                          >
                            <option value="">Not mapped</option>
                            {file.headers.map((header) => (
                              <option key={header} value={header}>
                                {header}
                              </option>
                            ))}
                          </select>
                        </label>
                      )
                    )}
                  </div>
                </div>
              ))}
          </div>
          <button
            type="button"
            className="mt-5 rounded-md bg-stone-950 px-5 py-3 text-sm font-semibold text-white"
            onClick={() => submitAudit(mappingOverride)}
          >
            Rerun with selected mappings
          </button>
        </div>
      ) : null}

      {result && result.status !== "needs_mapping" ? (
        <div className="flex flex-col gap-6">
          <ProductPanel>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-800">
                  Audit result
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
                  {result.summary.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">{result.summary.detail}</p>
              </div>
              <StatusBadge>
                Risk score: <span className="font-semibold">{result.riskScore}</span>
              </StatusBadge>
            </div>
          </ProductPanel>

          <ProductPanel>
            <h3 className="text-lg font-semibold tracking-tight text-stone-950">
              Coverage and uploaded files
            </h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {result.fileResults.map((file) => (
                <div key={file.fileName} className="border border-stone-200 bg-white p-4 text-sm">
                  <div className="font-medium text-stone-950">{file.fileName}</div>
                  <div className="mt-1 capitalize text-stone-600">{file.role.replace(/_/g, " ")}</div>
                  <div className="mt-1 text-stone-500">{file.rowCount} rows</div>
                  <div className="mt-1 text-stone-500">
                    Suggested role: {file.suggestedRole.replace(/_/g, " ")}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-stone-950">Coverage gaps</h4>
              <ul className="mt-2 list-disc pl-5 text-sm leading-6 text-stone-600">
                {result.coverageGaps.length ? (
                  result.coverageGaps.map((gap) => <li key={gap.id}>{gap.title}: {gap.detail}</li>)
                ) : (
                  <li>No coverage gaps detected.</li>
                )}
              </ul>
            </div>
          </ProductPanel>

          <ProductPanel>
            <h3 className="text-lg font-semibold tracking-tight text-stone-950">Audit findings</h3>
            <div className="mt-4 flex flex-col gap-4">
              {result.findings.length ? (
                result.findings.map((finding) => (
                  <div key={finding.id} className="border border-stone-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="font-medium text-stone-950">{finding.title}</div>
                      <InlineBadge>{finding.severity}</InlineBadge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{finding.detail}</p>
                    <ul className="mt-3 list-disc pl-5 text-sm leading-6 text-stone-600">
                      {finding.evidence.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <p className="text-sm text-stone-600">No rule-based findings were triggered.</p>
              )}
            </div>
          </ProductPanel>

          <ProductPanel>
            <h3 className="text-lg font-semibold tracking-tight text-stone-950">AI explanation</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone-600">{result.aiNotes.content}</p>
          </ProductPanel>

          <DownloadButtons
            json={result.exports.json}
            markdown={result.exports.markdown}
            baseName="trustgate-audit-pack-report"
          />
        </div>
      ) : null}
    </div>
  );
}
