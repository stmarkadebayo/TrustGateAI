import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import sharp from "sharp";
import { createWorker, PSM } from "tesseract.js";
import type { ExtractedField, VerifyDocType } from "@/lib/verify/types";

type TextExtraction = {
  text: string;
  pageCount: number;
  method: string;
};

async function runImageOcr(buffer: Buffer, mode: string) {
  const worker = await createWorker("eng");
  try {
    if (mode === "retry") {
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        preserve_interword_spaces: "1",
      });
    }
    const { data } = await worker.recognize(buffer);
    return data.text.trim();
  } finally {
    await worker.terminate();
  }
}

async function preprocessImage(buffer: Buffer) {
  return sharp(buffer)
    .grayscale()
    .normalize()
    .sharpen()
    .threshold(180)
    .png()
    .toBuffer();
}

export async function extractDocumentText(file: File, buffer: Buffer): Promise<TextExtraction> {
  const mime = file.type.toLowerCase();

  if (mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
    let text = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      text += content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .concat("\n");
    }

    return {
      text: text.trim(),
      pageCount: pdf.numPages,
      method: "pdf-text",
    };
  }

  if (mime.startsWith("image/")) {
    const primaryText = await runImageOcr(buffer, "primary");
    let bestText = primaryText;
    let method = "image-ocr";

    if (primaryText.length < 120) {
      try {
        const processed = await preprocessImage(buffer);
        const retryText = await runImageOcr(processed, "retry");
        if (retryText.length > bestText.length) {
          bestText = retryText;
          method = "image-ocr-preprocessed";
        }
      } catch {
        // keep the primary OCR result if preprocessing fails
      }
    }

    return {
      text: bestText,
      pageCount: 1,
      method,
    };
  }

  throw new Error("Unsupported verification file type. Use PDF, PNG, JPG, or JPEG.");
}

function hasAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

export function detectDocumentType(text: string, preferred: VerifyDocType): Exclude<VerifyDocType, "auto"> {
  if (preferred !== "auto") {
    return preferred;
  }

  const normalized = text.toLowerCase();

  if (hasAny(normalized, [/w-9/, /taxpayer identification/, /\bein\b/, /\btin\b/, /tax identification/])) {
    return "tax_form";
  }

  if (hasAny(normalized, [/certificate of insurance/, /policy number/, /insured/, /coverage/])) {
    return "insurance";
  }

  if (hasAny(normalized, [/corporate affairs commission/, /\bcac\b/, /articles of incorporation/, /certificate of incorporation/, /registered business/])) {
    return "registration";
  }

  if (hasAny(normalized, [/invoice/, /bill to/, /subtotal/, /purchase order/])) {
    return "invoice";
  }

  if (hasAny(normalized, [/certificate/, /registration/, /valid until/, /issued on/])) {
    return "certificate";
  }

  return "letter";
}

export function extractFields(text: string, docType: Exclude<VerifyDocType, "auto">): ExtractedField[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const joined = lines.join("\n");
  const fields: ExtractedField[] = [];

  const invoiceIdMatch = joined.match(/(?:invoice(?:\s*number)?|inv[\s#:.-]*)([A-Z0-9-]{4,})/i);
  const certificateIdMatch = joined.match(/(?:certificate(?:\s*number)?|cert[\s#:.-]*)([A-Z0-9-]{4,})/i);
  const registrationIdMatch = joined.match(/(?:registration(?:\s*number)?|rc[\s#:.-]*|cac[\s#:.-]*)([A-Z0-9-]{4,})/i);
  const taxIdMatch = joined.match(/(?:tin|ein|tax(?:payer)?\s*identification(?:\s*number)?)[^\dA-Z]*([A-Z0-9-]{6,})/i);
  const policyIdMatch = joined.match(/(?:policy(?:\s*number)?)[^\dA-Z]*([A-Z0-9-]{4,})/i);
  const dateMatch = joined.match(/(\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b)/);
  const secondDateMatch = joined.match(/(?:valid until|expiry|expiration|effective date|issued on)[:\s]*([A-Za-z0-9,\/ -]{6,30})/i);
  const amountMatch = joined.match(/(?:total|amount|sum)[^\d]*([\d,]+(?:\.\d{2})?)/i);
  const companyLine = lines.find((line) => /limited|ltd|company|corporation|services/i.test(line));

  if (docType === "invoice" && invoiceIdMatch) {
    fields.push({ key: "invoiceId", value: invoiceIdMatch[1], confidence: "high" });
  }

  if (docType === "certificate" && certificateIdMatch) {
    fields.push({ key: "certificateId", value: certificateIdMatch[1], confidence: "high" });
  }

  if (docType === "registration" && registrationIdMatch) {
    fields.push({ key: "registrationId", value: registrationIdMatch[1], confidence: "high" });
  }

  if (docType === "tax_form" && taxIdMatch) {
    fields.push({ key: "taxId", value: taxIdMatch[1], confidence: "high" });
  }

  if (docType === "insurance" && policyIdMatch) {
    fields.push({ key: "policyNumber", value: policyIdMatch[1], confidence: "high" });
  }

  if (dateMatch) {
    fields.push({ key: "documentDate", value: dateMatch[1], confidence: "medium" });
  }

  if (secondDateMatch) {
    fields.push({ key: "effectiveOrExpiryDate", value: secondDateMatch[1], confidence: "low" });
  }

  if (amountMatch && docType === "invoice") {
    fields.push({ key: "amount", value: amountMatch[1], confidence: "medium" });
  }

  if (companyLine) {
    fields.push({ key: "organization", value: companyLine, confidence: "low" });
  }

  return fields;
}
