import { ToolPage } from "@/components/app-shell";
import { AuditClient } from "@/components/audit-client";

export default function AuditPage() {
  return (
    <ToolPage
      label="Audit"
      title="Audit files for payment and procurement risk."
      description="Upload invoices, payments, purchase orders, vendor files, or receipts. TrustGateAI checks the records and returns findings you can inspect."
    >
      <AuditClient />
    </ToolPage>
  );
}
