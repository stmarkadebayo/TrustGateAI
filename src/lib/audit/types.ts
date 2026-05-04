import type { BaseResult, RiskBand } from "@/lib/shared/types";

export type AuditMode = "general" | "procurement" | "payments";

export type AuditFileRole =
  | "invoices"
  | "payments"
  | "purchase_orders"
  | "vendors"
  | "receipts";

export type CanonicalAuditRecord = {
  transactionId: string;
  vendor: string;
  amount: number | null;
  currency?: string;
  invoiceDate?: string;
  paymentDate?: string;
  referenceId?: string;
  receiptId?: string;
  status?: string;
  raw: Record<string, unknown>;
  rowNumber: number;
};

export type AuditMapping = Partial<
  Record<keyof Omit<CanonicalAuditRecord, "raw" | "rowNumber">, string>
>;

export type AuditPackFileInput = {
  fileName: string;
  fileType: string;
  role: AuditFileRole;
  buffer: Buffer;
  overrideMapping?: AuditMapping;
};

export type AuditPackFileResult = {
  role: AuditFileRole;
  suggestedRole: AuditFileRole;
  roleConfidence: number;
  fileName: string;
  fileType: string;
  rowCount: number;
  headers: string[];
  previewRows: Record<string, unknown>[];
  inferredMapping: AuditMapping;
  mappingConfidence: number;
  mappingNeeded: boolean;
  records: CanonicalAuditRecord[];
};

export type AuditCoverageGap = {
  id: string;
  title: string;
  detail: string;
};

export type AuditAnalysisResult = BaseResult & {
  fileResults: AuditPackFileResult[];
  riskScore: number;
  riskBand: RiskBand;
  coverageGaps: AuditCoverageGap[];
};
