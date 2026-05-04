"use client";

import { useState } from "react";
import { DownloadButtons } from "@/components/download-buttons";
import type {
  VerificationResult,
  VerifyCountry,
  VerifyDocType,
  VerifySubmissionType,
} from "@/lib/verify/types";

type VerifyUploadItem = {
  file: File;
  docType: VerifyDocType;
};

export function VerifyClient() {
  const [files, setFiles] = useState<VerifyUploadItem[]>([]);
  const [country, setCountry] = useState<VerifyCountry>("nigeria");
  const [submissionType, setSubmissionType] = useState<VerifySubmissionType>("generic_packet");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addFiles(selected: FileList | null) {
    if (!selected?.length) {
      return;
    }

    setFiles((current) => [
      ...current,
      ...Array.from(selected).map((file) => ({ file, docType: "auto" as VerifyDocType })),
    ]);
  }

  async function submit() {
    if (!files.length) {
      setError("Choose one or more files before running verification.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("country", country);
      formData.append("submissionType", submissionType);

      files.forEach((item) => {
        formData.append("files", item.file);
        formData.append("docTypes", item.docType);
      });

      const response = await fetch("/api/verify", {
        method: "POST",
        body: formData,
      });

      const json = (await response.json()) as VerificationResult | { error: string };

      if (!response.ok || "error" in json) {
        throw new Error("error" in json ? json.error : "Verification request failed.");
      }

      setResult(json);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Verification request failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Upload a verification bundle</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Upload the primary document and its supporting packet. TrustGateAI will run bundle-level checks using the selected country pack and submission type.
        </p>
        <div className="mt-4 flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <select
              value={country}
              onChange={(event) => setCountry(event.target.value as VerifyCountry)}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm"
            >
              <option value="nigeria">Nigeria</option>
              <option value="us">United States</option>
            </select>
            <select
              value={submissionType}
              onChange={(event) => setSubmissionType(event.target.value as VerifySubmissionType)}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm"
            >
              <option value="vendor_onboarding">Vendor onboarding pack</option>
              <option value="invoice_support">Invoice support pack</option>
              <option value="authorization_review">Authorization review</option>
              <option value="generic_packet">Generic compliance packet</option>
            </select>
          </div>

          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            multiple
            onChange={(event) => addFiles(event.target.files)}
            className="block w-full text-sm text-zinc-700"
          />

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
                    value={item.docType}
                    onChange={(event) =>
                      setFiles((current) =>
                        current.map((entry, entryIndex) =>
                          entryIndex === index
                            ? { ...entry, docType: event.target.value as VerifyDocType }
                            : entry
                        )
                      )
                    }
                    className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
                  >
                    <option value="auto">Auto-detect</option>
                    <option value="invoice">Invoice</option>
                    <option value="certificate">Certificate</option>
                    <option value="letter">Letter / authorization</option>
                    <option value="registration">Registration support</option>
                    <option value="tax_form">Tax form</option>
                    <option value="insurance">Insurance</option>
                  </select>
                </div>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {loading ? "Verifying..." : "Run verification bundle"}
          </button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </div>

      {result ? (
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-zinc-900">{result.summary.title}</h3>
                <p className="mt-2 text-sm text-zinc-600">{result.summary.detail}</p>
              </div>
              <div className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm text-zinc-800 capitalize">
                Status: <span className="font-semibold">{result.status}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-zinc-900">Bundle coverage</h3>
            <ul className="mt-3 list-disc pl-5 text-sm text-zinc-600">
              {result.coverageGaps.length ? (
                result.coverageGaps.map((gap) => <li key={gap.id}>{gap.title}: {gap.detail}</li>)
              ) : (
                <li>No coverage gaps detected.</li>
              )}
            </ul>
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-zinc-900">Missing expected documents</h4>
              <ul className="mt-2 list-disc pl-5 text-sm text-zinc-600">
                {result.missingDocuments.length ? (
                  result.missingDocuments.map((doc) => <li key={doc}>{doc}</li>)
                ) : (
                  <li>No required documents missing for this packet.</li>
                )}
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-zinc-900">Bundle files</h3>
            <div className="mt-4 grid gap-4">
              {result.fileResults.map((file) => (
                <div key={file.fileName} className="rounded-xl border border-zinc-200 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="font-medium text-zinc-900">{file.fileName}</div>
                    <div className="text-xs uppercase tracking-wide text-zinc-500">{file.detectedDocType}</div>
                  </div>
                  <div className="mt-2 text-xs text-zinc-500">
                    Profiles: {file.validatorProfiles.join(", ") || "none"}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    Registry: {file.registryResult.status} {file.registryResult.source ? `(${file.registryResult.source})` : ""}
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {file.extractedFields.length ? (
                      file.extractedFields.map((field) => (
                        <div key={`${file.fileName}-${field.key}-${field.value}`} className="rounded-lg bg-zinc-50 p-3 text-sm">
                          <div className="font-medium text-zinc-900">{field.key}</div>
                          <div className="mt-1 text-zinc-600">{field.value}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-zinc-600">No structured fields extracted.</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-zinc-900">Integrity findings</h3>
            <div className="mt-4 flex flex-col gap-4">
              {result.findings.map((finding) => (
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
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-zinc-900">AI explanation</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-600">{result.aiNotes.content}</p>
          </div>

          <DownloadButtons
            json={result.exports.json}
            markdown={result.exports.markdown}
            baseName="trustgate-verification-bundle-report"
          />
        </div>
      ) : null}
    </div>
  );
}
