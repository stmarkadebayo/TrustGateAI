import type {
  VerifyCountry,
  VerifyDocType,
  VerificationCoverageGap,
  VerifySubmissionType,
} from "@/lib/verify/types";

type SubmissionDefinition = {
  label: string;
  requiredDocTypes: Array<Exclude<VerifyDocType, "auto">>;
  optionalDocTypes: Array<Exclude<VerifyDocType, "auto">>;
  consistencyKeys: string[];
};

type PackDefinition = {
  label: string;
  docs: Record<Exclude<VerifyDocType, "auto">, string>;
  submissions: Record<VerifySubmissionType, SubmissionDefinition>;
  identifierKeys: string[];
  organizationKeys: string[];
};

const PACKS: Record<VerifyCountry, PackDefinition> = {
  nigeria: {
    label: "Nigeria pack",
    docs: {
      invoice: "Invoice",
      certificate: "Qualification or certificate support",
      letter: "OEM authorization or formal letter",
      registration: "CAC or business registration support",
      tax_form: "Tax clearance or tax support",
      insurance: "Insurance support",
    },
    submissions: {
      vendor_onboarding: {
        label: "Vendor onboarding pack",
        requiredDocTypes: ["registration", "tax_form"],
        optionalDocTypes: ["certificate", "letter"],
        consistencyKeys: ["organization", "registrationId", "taxId"],
      },
      invoice_support: {
        label: "Invoice support pack",
        requiredDocTypes: ["invoice"],
        optionalDocTypes: ["letter", "registration"],
        consistencyKeys: ["organization", "invoiceId", "amount"],
      },
      authorization_review: {
        label: "Authorization review",
        requiredDocTypes: ["letter"],
        optionalDocTypes: ["certificate", "registration"],
        consistencyKeys: ["organization", "registrationId"],
      },
      generic_packet: {
        label: "Generic compliance packet",
        requiredDocTypes: [],
        optionalDocTypes: ["invoice", "certificate", "letter", "registration", "tax_form"],
        consistencyKeys: ["organization", "documentDate"],
      },
    },
    identifierKeys: ["certificateId", "registrationId", "taxId", "invoiceId"],
    organizationKeys: ["organization"],
  },
  us: {
    label: "United States pack",
    docs: {
      invoice: "Invoice",
      certificate: "Vendor qualification support",
      letter: "Authorization or formal letter",
      registration: "Business registration support",
      tax_form: "W-9 or tax identity support",
      insurance: "Certificate of insurance",
    },
    submissions: {
      vendor_onboarding: {
        label: "Vendor onboarding pack",
        requiredDocTypes: ["registration", "tax_form"],
        optionalDocTypes: ["insurance", "certificate"],
        consistencyKeys: ["organization", "registrationId", "taxId"],
      },
      invoice_support: {
        label: "Invoice support pack",
        requiredDocTypes: ["invoice"],
        optionalDocTypes: ["letter", "tax_form"],
        consistencyKeys: ["organization", "invoiceId", "amount"],
      },
      authorization_review: {
        label: "Authorization review",
        requiredDocTypes: ["letter"],
        optionalDocTypes: ["certificate", "registration"],
        consistencyKeys: ["organization", "registrationId"],
      },
      generic_packet: {
        label: "Generic compliance packet",
        requiredDocTypes: [],
        optionalDocTypes: ["invoice", "certificate", "letter", "registration", "tax_form", "insurance"],
        consistencyKeys: ["organization", "documentDate"],
      },
    },
    identifierKeys: ["registrationId", "taxId", "policyNumber", "invoiceId"],
    organizationKeys: ["organization"],
  },
};

export function getPack(country: VerifyCountry) {
  return PACKS[country];
}

export function buildCoverageGaps(
  country: VerifyCountry,
  submissionType: VerifySubmissionType,
  missingDocuments: string[]
): VerificationCoverageGap[] {
  const gaps: VerificationCoverageGap[] = [];
  const pack = PACKS[country];
  const submission = pack.submissions[submissionType];

  for (const documentLabel of missingDocuments) {
    gaps.push({
      id: `missing-${documentLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      title: "Expected supporting document missing",
      detail: `${documentLabel} is expected for the ${submission.label} flow in the ${pack.label}.`,
    });
  }

  return gaps;
}
