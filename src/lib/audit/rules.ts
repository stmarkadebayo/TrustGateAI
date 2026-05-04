import type { CanonicalAuditRecord } from "@/lib/audit/types";
import type { AnalysisFinding, Severity } from "@/lib/shared/types";

function makeFinding(
  id: string,
  severity: Severity,
  title: string,
  detail: string,
  evidence: string[],
  ruleId: string
): AnalysisFinding {
  return { id, severity, title, detail, evidence, ruleId };
}

function parseDate(value?: string) {
  if (!value) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function median(values: number[]) {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function quartile(values: number[], q: number) {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined
    ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
    : sorted[base];
}

export function runAuditRules(records: CanonicalAuditRecord[]) {
  const findings: AnalysisFinding[] = [];
  const amounts = records
    .map((record) => record.amount)
    .filter(
      (amount): amount is number => typeof amount === "number" && Number.isFinite(amount)
    );
  const q3 = quartile(amounts, 0.75);
  const iqr = q3 - quartile(amounts, 0.25);
  const medianAmount = median(amounts);
  const vendorCounts = new Map<string, number>();
  const idCounts = new Map<string, CanonicalAuditRecord[]>();
  const vendorAmountDate = new Map<string, CanonicalAuditRecord[]>();

  for (const record of records) {
    vendorCounts.set(record.vendor, (vendorCounts.get(record.vendor) ?? 0) + 1);
    idCounts.set(record.transactionId, [
      ...(idCounts.get(record.transactionId) ?? []),
      record,
    ]);

    const dateKey = record.invoiceDate ?? record.paymentDate ?? "n/a";
    const tripleKey = `${record.vendor}|${record.amount}|${dateKey}`;
    vendorAmountDate.set(tripleKey, [
      ...(vendorAmountDate.get(tripleKey) ?? []),
      record,
    ]);

    if (!record.vendor || record.amount === null) {
      findings.push(
        makeFinding(
          `missing-${record.rowNumber}`,
          "high",
          "Missing required fields",
          "Vendor and amount are required to run meaningful audit checks.",
          [`Row ${record.rowNumber}`],
          "missing_required_fields"
        )
      );
    }

    if (record.amount !== null && record.amount <= 0) {
      findings.push(
        makeFinding(
          `amount-${record.rowNumber}`,
          "medium",
          "Non-positive amount",
          "This transaction contains a zero or negative amount and should be reviewed.",
          [`Row ${record.rowNumber}: amount=${record.amount}`],
          "non_positive_amount"
        )
      );
    }

    if (record.invoiceDate && parseDate(record.invoiceDate) === null) {
      findings.push(
        makeFinding(
          `invoice-date-${record.rowNumber}`,
          "medium",
          "Invalid invoice date",
          "The invoice date could not be parsed into a valid calendar date.",
          [`Row ${record.rowNumber}: invoiceDate=${record.invoiceDate}`],
          "invalid_invoice_date"
        )
      );
    }

    if (record.paymentDate && parseDate(record.paymentDate) === null) {
      findings.push(
        makeFinding(
          `payment-date-${record.rowNumber}`,
          "medium",
          "Invalid payment date",
          "The payment date could not be parsed into a valid calendar date.",
          [`Row ${record.rowNumber}: paymentDate=${record.paymentDate}`],
          "invalid_payment_date"
        )
      );
    }

    if (record.amount !== null && iqr > 0 && record.amount > q3 + 1.5 * iqr) {
      findings.push(
        makeFinding(
          `outlier-${record.rowNumber}`,
          "medium",
          "Amount outlier",
          `The transaction amount is materially above the dataset norm (median ${medianAmount.toFixed(2)}).`,
          [`Row ${record.rowNumber}: amount=${record.amount}`],
          "amount_outlier"
        )
      );
    }

    if (record.amount !== null && record.amount % 1000 === 0) {
      findings.push(
        makeFinding(
          `round-${record.rowNumber}`,
          "low",
          "Round-number transaction",
          "Round-number concentration can indicate split or manually shaped payments.",
          [`Row ${record.rowNumber}: amount=${record.amount}`],
          "round_number"
        )
      );
    }

    if (record.referenceId && record.amount !== null) {
      const referenced = records.find(
        (candidate) =>
          candidate.transactionId !== record.transactionId &&
          candidate.referenceId === record.referenceId &&
          candidate.amount !== null
      );
      if (
        referenced &&
        referenced.amount !== null &&
        record.amount > referenced.amount
      ) {
        findings.push(
          makeFinding(
            `po-${record.rowNumber}`,
            "medium",
            "Payment exceeds referenced amount",
            "The amount is higher than another record linked by the same reference or PO identifier.",
            [
              `Row ${record.rowNumber}: amount=${record.amount}`,
              `Reference ${record.referenceId} comparison amount=${referenced.amount}`,
            ],
            "reference_amount_mismatch"
          )
        );
      }
    }
  }

  for (const [id, duplicates] of idCounts.entries()) {
    if (!id.startsWith("row-") && duplicates.length > 1) {
      findings.push(
        makeFinding(
          `dup-id-${id}`,
          "high",
          "Duplicate transaction identifier",
          "The same invoice or transaction id appears multiple times in the dataset.",
          duplicates.map((row) => `Row ${row.rowNumber}: ${row.transactionId}`),
          "duplicate_transaction_id"
        )
      );
    }
  }

  for (const [key, duplicates] of vendorAmountDate.entries()) {
    if (duplicates.length > 1) {
      findings.push(
        makeFinding(
          `dup-triple-${key}`,
          "high",
          "Duplicate vendor, amount, and date pattern",
          "The same vendor has repeated transactions with the same amount on the same date.",
          duplicates.map((row) => `Row ${row.rowNumber}`),
          "duplicate_vendor_amount_date"
        )
      );
    }
  }

  for (const [vendor, count] of vendorCounts.entries()) {
    if (vendor && count / Math.max(records.length, 1) > 0.45 && records.length > 3) {
      findings.push(
        makeFinding(
          `vendor-concentration-${vendor}`,
          "medium",
          "Vendor concentration anomaly",
          "A large share of transactions is concentrated on a single vendor.",
          [`Vendor ${vendor}: ${count} of ${records.length} records`],
          "vendor_concentration"
        )
      );
    }

    const vendorRecords = records
      .filter((record) => record.vendor === vendor && record.amount !== null)
      .sort(
        (a, b) =>
          (parseDate(a.paymentDate ?? a.invoiceDate ?? "") ?? 0) -
          (parseDate(b.paymentDate ?? b.invoiceDate ?? "") ?? 0)
      );

    for (let index = 1; index < vendorRecords.length; index += 1) {
      const current = vendorRecords[index];
      const previous = vendorRecords[index - 1];
      const currentDate = parseDate(current.paymentDate ?? current.invoiceDate);
      const previousDate = parseDate(previous.paymentDate ?? previous.invoiceDate);

      if (
        current.amount !== null &&
        previous.amount !== null &&
        currentDate !== null &&
        previousDate !== null &&
        Math.round(current.amount + previous.amount) % 1000 === 0 &&
        currentDate - previousDate <= 7 * 24 * 60 * 60 * 1000
      ) {
        findings.push(
          makeFinding(
            `split-${previous.rowNumber}-${current.rowNumber}`,
            "medium",
            "Potential split payment",
            "Adjacent vendor payments within a short window combine into a rounded figure.",
            [
              `Rows ${previous.rowNumber} and ${current.rowNumber}`,
              `Combined amount=${previous.amount + current.amount}`,
            ],
            "split_payment"
          )
        );
      }
    }
  }

  return findings;
}

export function scoreAuditFindings(findings: AnalysisFinding[]) {
  const score = findings.reduce((total, finding) => {
    if (finding.severity === "high") {
      return total + 18;
    }

    if (finding.severity === "medium") {
      return total + 10;
    }

    return total + 4;
  }, 0);

  return Math.min(score, 100);
}
