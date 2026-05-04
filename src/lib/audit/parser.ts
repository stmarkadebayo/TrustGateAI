import * as XLSX from "xlsx";
import type {
  AuditFileRole,
  AuditMapping,
  CanonicalAuditRecord,
} from "@/lib/audit/types";

const FIELD_ALIASES: Record<string, string[]> = {
  transactionId: [
    "transactionid",
    "transaction_id",
    "invoice",
    "invoiceid",
    "invoicenumber",
    "invoice_number",
    "id",
    "paymentid",
    "payment_id",
  ],
  vendor: [
    "vendor",
    "vendorname",
    "supplier",
    "suppliername",
    "payee",
    "company",
  ],
  amount: ["amount", "invoiceamount", "paymentamount", "value", "total", "sum"],
  currency: ["currency", "curr", "ccy"],
  invoiceDate: ["invoicedate", "invoice_date", "date"],
  paymentDate: ["paymentdate", "payment_date", "paiddate", "settlementdate"],
  referenceId: [
    "reference",
    "referenceid",
    "po",
    "pono",
    "po_number",
    "purchaseorder",
    "contractid",
  ],
  receiptId: ["receipt", "receiptid", "deliverynote", "goodsreceipt"],
  status: ["status", "paymentstatus", "state"],
};

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function scoreHeaderMatches(headers: string[], aliases: string[]) {
  return headers.reduce((score, header) => {
    return score + (aliases.includes(normalizeHeader(header)) ? 1 : 0);
  }, 0);
}

export function inferAuditRole(fileName: string, headers: string[]) {
  const lowerName = fileName.toLowerCase();
  const normalizedHeaders = headers.map(normalizeHeader);

  const roleSignals: Record<AuditFileRole, string[]> = {
    invoices: [
      "invoice",
      "invoicenumber",
      "invoiceid",
      "billto",
      "subtotal",
    ],
    payments: [
      "payment",
      "paiddate",
      "paymentdate",
      "settlement",
      "remittance",
    ],
    purchase_orders: ["po", "pono", "purchaseorder", "contractid", "contract"],
    vendors: ["vendor", "supplier", "vendorname", "taxid", "tin", "ein"],
    receipts: ["receipt", "goodsreceipt", "deliverynote", "grn", "received"],
  };

  let bestRole: AuditFileRole = "invoices";
  let bestScore = 0;

  for (const [role, signals] of Object.entries(roleSignals) as Array<
    [AuditFileRole, string[]]
  >) {
    const fileNameScore = signals.reduce(
      (score, signal) => score + (lowerName.includes(signal) ? 2 : 0),
      0
    );
    const headerScore =
      scoreHeaderMatches(normalizedHeaders, signals) +
      (role === "payments" && normalizedHeaders.includes("paymentamount") ? 2 : 0) +
      (role === "purchase_orders" && normalizedHeaders.includes("ponumber") ? 2 : 0);
    const score = fileNameScore + headerScore;

    if (score > bestScore) {
      bestScore = score;
      bestRole = role;
    }
  }

  return {
    role: bestRole,
    confidence: bestScore >= 5 ? 0.95 : bestScore >= 3 ? 0.8 : 0.55,
  };
}

export function parseAuditFile(buffer: Buffer, fileName: string) {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".json")) {
    const parsed = JSON.parse(buffer.toString("utf8")) as unknown;
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    return rows.map((row) =>
      typeof row === "object" && row ? (row as Record<string, unknown>) : {}
    );
  }

  if (
    lower.endsWith(".csv") ||
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xls")
  ) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
    });
  }

  throw new Error("Unsupported audit file type. Use CSV, XLSX, or JSON.");
}

export function inferAuditMapping(headers: string[], override?: AuditMapping) {
  const mapping: AuditMapping = { ...override };
  let hits = 0;

  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (mapping[field as keyof AuditMapping]) {
      hits += 1;
      continue;
    }

    const match = headers.find((header) =>
      aliases.includes(normalizeHeader(header))
    );

    if (match) {
      mapping[field as keyof AuditMapping] = match;
      hits += 1;
    }
  }

  return {
    mapping,
    confidence: Math.min(1, hits / 5),
  };
}

function readString(row: Record<string, unknown>, key?: string) {
  if (!key) {
    return undefined;
  }

  const value = row[key];

  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  return String(value).trim();
}

function readNumber(row: Record<string, unknown>, key?: string) {
  if (!key) {
    return null;
  }

  const raw = row[key];

  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null;
  }

  if (typeof raw === "string") {
    const normalized = raw.replace(/[^0-9.-]/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function normalizeAuditRows(
  rows: Record<string, unknown>[],
  mapping: AuditMapping
): CanonicalAuditRecord[] {
  return rows.map((row, index) => ({
    transactionId: readString(row, mapping.transactionId) ?? `row-${index + 1}`,
    vendor: readString(row, mapping.vendor) ?? "",
    amount: readNumber(row, mapping.amount),
    currency: readString(row, mapping.currency),
    invoiceDate: readString(row, mapping.invoiceDate),
    paymentDate: readString(row, mapping.paymentDate),
    referenceId: readString(row, mapping.referenceId),
    receiptId: readString(row, mapping.receiptId),
    status: readString(row, mapping.status),
    raw: row,
    rowNumber: index + 1,
  }));
}
