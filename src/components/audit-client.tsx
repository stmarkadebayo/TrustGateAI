"use client";

import { useState } from "react";
import { DownloadButtons } from "@/components/download-buttons";
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
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Upload audit review pack</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Upload invoices, payments, purchase orders, vendor files, and receipts. TrustGateAI will run single-file rules and cross-file reconciliation where supporting files are available.
            </p>
          </div>
          <input
            type="file"
            accept=".csv,.json,.xlsx,.xls"
            multiple
            onChange={(event) => addFiles(event.target.files)}
            className="block w-full text-sm text-zinc-700"
          />
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as AuditMode)}
            className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm"
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
                  className="grid gap-3 rounded-xl border border-zinc-200 p-4 md:grid-cols-[1fr_220px]"
                >
                  <div>
                    <div className="font-medium text-zinc-900">{item.file.name}</div>
                    <div className="text-sm text-zinc-500">{item.file.type || "unknown type"}</div>
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
                    className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
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
            className="rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {loading ? "Running audit..." : "Run audit pack"}
          </button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </div>

      {result?.status === "needs_mapping" ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-6">
          <h3 className="text-lg font-semibold text-amber-950">Confirm key columns</h3>
          <div className="mt-4 flex flex-col gap-6">
            {result.fileResults
              .filter((file) => file.mappingNeeded)
              .map((file) => (
                <div key={file.fileName} className="rounded-xl border border-amber-200 bg-white p-4">
                  <div className="font-medium text-zinc-900">{file.fileName}</div>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    {(["transactionId", "vendor", "amount", "invoiceDate", "paymentDate", "referenceId"] as const).map(
                      (field) => (
                        <label key={field} className="flex flex-col gap-2 text-sm text-zinc-800">
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
                            className="rounded-xl border border-zinc-300 px-3 py-2"
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
            className="mt-5 rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white"
            onClick={() => submitAudit(mappingOverride)}
          >
            Rerun with selected mappings
          </button>
        </div>
      ) : null}

      {result && result.status !== "needs_mapping" ? (
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-zinc-900">{result.summary.title}</h3>
                <p className="mt-2 text-sm text-zinc-600">{result.summary.detail}</p>
              </div>
              <div className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-800">
                Risk score: <span className="font-semibold">{result.riskScore}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-zinc-900">Coverage and uploaded files</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {result.fileResults.map((file) => (
                <div key={file.fileName} className="rounded-xl border border-zinc-200 p-4 text-sm">
                  <div className="font-medium text-zinc-900">{file.fileName}</div>
                  <div className="mt-1 capitalize text-zinc-600">{file.role.replace(/_/g, " ")}</div>
                  <div className="mt-1 text-zinc-500">{file.rowCount} rows</div>
                  <div className="mt-1 text-zinc-500">
                    Suggested role: {file.suggestedRole.replace(/_/g, " ")}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-zinc-900">Coverage gaps</h4>
              <ul className="mt-2 list-disc pl-5 text-sm text-zinc-600">
                {result.coverageGaps.length ? (
                  result.coverageGaps.map((gap) => <li key={gap.id}>{gap.title}: {gap.detail}</li>)
                ) : (
                  <li>No coverage gaps detected.</li>
                )}
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-zinc-900">Audit findings</h3>
            <div className="mt-4 flex flex-col gap-4">
              {result.findings.length ? (
                result.findings.map((finding) => (
                  <div key={finding.id} className="rounded-xl border border-zinc-200 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="font-medium text-zinc-900">{finding.title}</div>
                      <div className="text-xs uppercase tracking-wide text-zinc-500">{finding.severity}</div>
                    </div>
                    <p className="mt-2 text-sm text-zinc-600">{finding.detail}</p>
                    <ul className="mt-3 list-disc pl-5 text-sm text-zinc-600">
                      {finding.evidence.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-600">No rule-based findings were triggered.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-zinc-900">AI explanation</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-600">{result.aiNotes.content}</p>
          </div>

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
