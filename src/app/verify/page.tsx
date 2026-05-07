import { ToolPage } from "@/components/app-shell";
import { VerifyClient } from "@/components/verify-client";

export default function VerifyPage() {
  return (
    <ToolPage
      label="Verify"
      title="Verify document bundles before approval."
      description="Upload vendor, invoice, authorization, or registration documents. TrustGateAI extracts evidence, checks required coverage, and flags integrity issues."
    >
      <VerifyClient />
    </ToolPage>
  );
}
