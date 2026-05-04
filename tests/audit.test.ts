import { describe, expect, it } from "vitest";
import {
  inferAuditMapping,
  inferAuditRole,
  normalizeAuditRows,
} from "../src/lib/audit/parser";
import { runAuditRules } from "../src/lib/audit/rules";

describe("audit parsing and rules", () => {
  it("infers common invoice columns", () => {
    const { mapping, confidence } = inferAuditMapping([
      "Invoice Number",
      "Vendor",
      "Amount",
      "Invoice Date",
      "PO Number",
    ]);

    expect(mapping.transactionId).toBe("Invoice Number");
    expect(mapping.vendor).toBe("Vendor");
    expect(mapping.amount).toBe("Amount");
    expect(confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("flags duplicate invoice ids", () => {
    const rows = normalizeAuditRows(
      [
        {
          "Invoice Number": "INV-100",
          Vendor: "Atlas Energy",
          Amount: "25000",
          "Invoice Date": "2024-12-01",
        },
        {
          "Invoice Number": "INV-100",
          Vendor: "Atlas Energy",
          Amount: "25000",
          "Invoice Date": "2024-12-01",
        },
      ],
      {
        transactionId: "Invoice Number",
        vendor: "Vendor",
        amount: "Amount",
        invoiceDate: "Invoice Date",
      }
    );

    const findings = runAuditRules(rows);
    expect(findings.some((finding) => finding.ruleId === "duplicate_transaction_id")).toBe(
      true
    );
  });

  it("infers payment file role from file name and headers", () => {
    const result = inferAuditRole("weekly_payments_export.xlsx", [
      "Payment Date",
      "Payment Amount",
      "Vendor",
    ]);

    expect(result.role).toBe("payments");
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });
});
