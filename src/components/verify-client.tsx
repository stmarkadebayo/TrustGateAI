"use client";

import { useState } from "react";
import { DownloadButtons } from "@/components/download-buttons";
import {
  FieldSelect,
  FileRow,
  InlineBadge,
  PrimaryButton,
  ProductPanel,
  StatusBadge,
  UploadDropzone,
  formatFileSize,
} from "@/components/product-ui";
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

    setResult(null);
    setError(null);
    setFiles((current) => [
      ...current,
      ...Array.from(selected).map((file) => ({ file, docType: "auto" as VerifyDocType })),
    ]);
  }

  function removeFile(index: number) {
    setResult(null);
    setError(null);
    setFiles((current) => current.filter((_, entryIndex) => entryIndex !== index));
  }

  function updateCountry(nextCountry: VerifyCountry) {
    setCountry(nextCountry);
    setResult(null);
    setError(null);
  }

  function updateSubmissionType(nextSubmissionType: VerifySubmissionType) {
    setSubmissionType(nextSubmissionType);
    setResult(null);
    setError(null);
  }

  function updateDocType(index: number, docType: VerifyDocType) {
    setResult(null);
    setError(null);
    setFiles((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, docType } : entry
      )
    );
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
      <ProductPanel>
        <h2 className="text-xl font-semibold tracking-tight text-stone-950">
          Upload verification bundle
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Add a primary document and any supporting files. The selected country
          and packet type control the expected evidence checks.
        </p>
        <div className="mt-5 flex flex-col gap-5">
          <div className="grid gap-4 md:grid-cols-2">
            <FieldSelect
              label="Country pack"
              value={country}
              onChange={(value) => updateCountry(value as VerifyCountry)}
            >
              <option value="nigeria">Nigeria</option>
              <option value="us">United States</option>
            </FieldSelect>
            <FieldSelect
              label="Packet type"
              value={submissionType}
              onChange={(value) => updateSubmissionType(value as VerifySubmissionType)}
            >
              <option value="vendor_onboarding">Vendor onboarding pack</option>
              <option value="invoice_support">Invoice support pack</option>
              <option value="authorization_review">Authorization review</option>
              <option value="generic_packet">Generic compliance packet</option>
            </FieldSelect>
          </div>

          <UploadDropzone
            id="verify-files"
            label="Upload documents"
            title="Drop verification files here"
            description="PDF, PNG, JPG, or JPEG. Add the full supporting packet when available."
            accept=".pdf,.png,.jpg,.jpeg"
            onFiles={addFiles}
          />

          {files.length ? (
            <div className="grid gap-3">
              {files.map((item, index) => (
                <FileRow
                  key={`${item.file.name}-${index}`}
                  fileName={item.file.name}
                  meta={`${item.file.type || "unknown type"} · ${formatFileSize(item.file.size)}`}
                  onRemove={() => removeFile(index)}
                >
                  <FieldSelect
                    value={item.docType}
                    onChange={(value) => updateDocType(index, value as VerifyDocType)}
                    className="px-3 py-2"
                  >
                    <option value="auto">Auto-detect</option>
                    <option value="invoice">Invoice</option>
                    <option value="certificate">Certificate</option>
                    <option value="letter">Letter / authorization</option>
                    <option value="registration">Registration support</option>
                    <option value="tax_form">Tax form</option>
                    <option value="insurance">Insurance</option>
                  </FieldSelect>
                </FileRow>
              ))}
            </div>
          ) : null}

          <PrimaryButton onClick={submit} disabled={loading}>
            {loading ? "Verifying..." : "Run verification bundle"}
          </PrimaryButton>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </ProductPanel>

      {result ? (
        <div className="flex flex-col gap-6">
          <ProductPanel>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-800">
                  Verification result
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
                  {result.summary.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">{result.summary.detail}</p>
              </div>
              <StatusBadge>
                Status: <span className="font-semibold">{result.status}</span>
              </StatusBadge>
            </div>
          </ProductPanel>

          <ProductPanel>
            <h3 className="text-lg font-semibold tracking-tight text-stone-950">Bundle coverage</h3>
            <ul className="mt-3 list-disc pl-5 text-sm leading-6 text-stone-600">
              {result.coverageGaps.length ? (
                result.coverageGaps.map((gap) => <li key={gap.id}>{gap.title}: {gap.detail}</li>)
              ) : (
                <li>No coverage gaps detected.</li>
              )}
            </ul>
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-stone-950">Missing expected documents</h4>
              <ul className="mt-2 list-disc pl-5 text-sm leading-6 text-stone-600">
                {result.missingDocuments.length ? (
                  result.missingDocuments.map((doc) => <li key={doc}>{doc}</li>)
                ) : (
                  <li>No required documents missing for this packet.</li>
                )}
              </ul>
            </div>
          </ProductPanel>

          <ProductPanel>
            <h3 className="text-lg font-semibold tracking-tight text-stone-950">Bundle files</h3>
            <div className="mt-4 grid gap-4">
              {result.fileResults.map((file) => (
                <div key={file.fileName} className="border border-stone-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="font-medium text-stone-950">{file.fileName}</div>
                    <InlineBadge>{file.detectedDocType}</InlineBadge>
                  </div>
                  <div className="mt-2 text-xs text-stone-500">
                    Profiles: {file.validatorProfiles.join(", ") || "none"}
                  </div>
                  <div className="mt-1 text-xs text-stone-500">
                    Registry: {file.registryResult.status} {file.registryResult.source ? `(${file.registryResult.source})` : ""}
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {file.extractedFields.length ? (
                      file.extractedFields.map((field) => (
                        <div key={`${file.fileName}-${field.key}-${field.value}`} className="bg-[#f7f5ef] p-3 text-sm">
                          <div className="font-medium text-stone-950">{field.key}</div>
                          <div className="mt-1 text-stone-600">{field.value}</div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-stone-600">No structured fields extracted.</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ProductPanel>

          <ProductPanel>
            <h3 className="text-lg font-semibold tracking-tight text-stone-950">Integrity findings</h3>
            <div className="mt-4 flex flex-col gap-4">
              {result.findings.map((finding) => (
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
              ))}
            </div>
          </ProductPanel>

          <ProductPanel>
            <h3 className="text-lg font-semibold tracking-tight text-stone-950">AI explanation</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone-600">{result.aiNotes.content}</p>
          </ProductPanel>

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
