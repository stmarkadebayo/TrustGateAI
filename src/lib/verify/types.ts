import type { BaseResult } from "@/lib/shared/types";

export type VerifyDocType =
  | "auto"
  | "invoice"
  | "certificate"
  | "letter"
  | "tax_form"
  | "insurance"
  | "registration";

export type VerifyCountry = "nigeria" | "us";

export type VerifySubmissionType =
  | "vendor_onboarding"
  | "invoice_support"
  | "authorization_review"
  | "generic_packet";

export type ExtractedField = {
  key: string;
  value: string;
  confidence: "high" | "medium" | "low";
};

export type RegistryResult = {
  configured: boolean;
  status: "match" | "no_match" | "inconclusive" | "unavailable";
  detail: string;
  source?: string;
};

export type VerificationBundleFile = {
  fileName: string;
  fileType: string;
  size: number;
  pageCount: number;
  detectedDocType: Exclude<VerifyDocType, "auto">;
  validatorProfiles: string[];
  extractedText: string;
  extractedFields: ExtractedField[];
  registryResult: RegistryResult;
};

export type VerificationCoverageGap = {
  id: string;
  title: string;
  detail: string;
};

export type VerificationResult = BaseResult & {
  country: VerifyCountry;
  submissionType: VerifySubmissionType;
  fileResults: VerificationBundleFile[];
  missingDocuments: string[];
  coverageGaps: VerificationCoverageGap[];
};
