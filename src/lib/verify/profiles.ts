import type {
  ExtractedField,
  VerifyCountry,
  VerifyDocType,
  VerifySubmissionType,
} from "@/lib/verify/types";
import type { AnalysisFinding } from "@/lib/shared/types";

export type ValidatorProfile =
  | "registration_cac"
  | "tax_clearance_ng"
  | "nogic_support"
  | "nipex_qualification"
  | "oem_authorization"
  | "w9"
  | "certificate_of_insurance"
  | "sam_reference"
  | "state_registration"
  | "authorization_letter"
  | "invoice_support";

function finding(
  id: string,
  severity: "low" | "medium" | "high",
  title: string,
  detail: string,
  evidence: string[],
  ruleId: string
): AnalysisFinding {
  return { id, severity, title, detail, evidence, ruleId };
}

function hasField(fields: ExtractedField[], key: string) {
  return fields.some((field) => field.key === key);
}

function textIncludes(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

export function getValidatorProfiles(args: {
  country: VerifyCountry;
  submissionType: VerifySubmissionType;
  docType: Exclude<VerifyDocType, "auto">;
}): ValidatorProfile[] {
  const profiles = new Set<ValidatorProfile>();

  if (args.docType === "invoice") {
    profiles.add("invoice_support");
  }

  if (args.docType === "letter") {
    profiles.add(args.submissionType === "authorization_review" ? "authorization_letter" : "oem_authorization");
  }

  if (args.country === "nigeria") {
    if (args.docType === "registration") profiles.add("registration_cac");
    if (args.docType === "tax_form") profiles.add("tax_clearance_ng");
    if (args.docType === "certificate") {
      profiles.add("nipex_qualification");
      profiles.add("nogic_support");
    }
    if (args.docType === "letter") profiles.add("oem_authorization");
  }

  if (args.country === "us") {
    if (args.docType === "tax_form") profiles.add("w9");
    if (args.docType === "insurance") profiles.add("certificate_of_insurance");
    if (args.docType === "registration") {
      profiles.add("state_registration");
      profiles.add("sam_reference");
    }
    if (args.docType === "letter") profiles.add("authorization_letter");
  }

  return [...profiles];
}

export function applyValidatorProfiles(args: {
  profiles: ValidatorProfile[];
  fileName: string;
  text: string;
  fields: ExtractedField[];
}): AnalysisFinding[] {
  const findings: AnalysisFinding[] = [];
  const lower = args.text.toLowerCase();

  for (const profile of args.profiles) {
    switch (profile) {
      case "registration_cac":
        if (!hasField(args.fields, "registrationId")) {
          findings.push(
            finding(
              `missing-registration-${args.fileName}`,
              "high",
              "CAC registration identifier missing",
              "This Nigeria registration-support document does not expose a clear CAC or registration identifier.",
              [args.fileName],
              "registration_cac_missing_id"
            )
          );
        }
        break;
      case "tax_clearance_ng":
        if (!hasField(args.fields, "taxId")) {
          findings.push(
            finding(
              `missing-tax-id-${args.fileName}`,
              "medium",
              "Tax identifier missing",
              "This Nigeria tax-support document does not expose a clear tax identifier.",
              [args.fileName],
              "tax_clearance_missing_tax_id"
            )
          );
        }
        break;
      case "nogic_support":
        if (!textIncludes(lower, [/local content/, /nogic/, /ncdmb/])) {
          findings.push(
            finding(
              `nogic-keywords-${args.fileName}`,
              "low",
              "Local-content support wording not detected",
              "The document was treated as a Nigeria qualification or support document, but no clear NOGIC/local-content wording was extracted.",
              [args.fileName],
              "nogic_support_keyword_gap"
            )
          );
        }
        break;
      case "nipex_qualification":
        if (!textIncludes(lower, [/nipex/, /\bjqs\b/, /joint qualification/])) {
          findings.push(
            finding(
              `nipex-keywords-${args.fileName}`,
              "low",
              "NIPEX/JQS wording not detected",
              "The qualification document does not clearly mention NIPEX, JQS, or joint qualification wording in extracted text.",
              [args.fileName],
              "nipex_keyword_gap"
            )
          );
        }
        break;
      case "oem_authorization":
      case "authorization_letter":
        if (!textIncludes(lower, [/authorize/, /authorized/, /distributor/, /representative/, /\boem\b/, /manufacturer/])) {
          findings.push(
            finding(
              `authorization-keywords-${args.fileName}`,
              "medium",
              "Authorization wording not detected",
              "The letter does not clearly show common authorization or representation wording in extracted text.",
              [args.fileName],
              "authorization_keyword_gap"
            )
          );
        }
        break;
      case "w9":
        if (!textIncludes(lower, [/w-9/, /request for taxpayer identification/, /taxpayer identification number/])) {
          findings.push(
            finding(
              `w9-keywords-${args.fileName}`,
              "medium",
              "W-9 wording not detected",
              "The uploaded US tax-support document does not clearly resemble a W-9 in extracted text.",
              [args.fileName],
              "w9_keyword_gap"
            )
          );
        }
        break;
      case "certificate_of_insurance":
        if (!hasField(args.fields, "policyNumber")) {
          findings.push(
            finding(
              `missing-policy-${args.fileName}`,
              "medium",
              "Policy number missing",
              "The certificate-of-insurance style document does not expose a clear policy number.",
              [args.fileName],
              "insurance_missing_policy_number"
            )
          );
        }
        break;
      case "sam_reference":
        if (!hasField(args.fields, "organization")) {
          findings.push(
            finding(
              `sam-org-${args.fileName}`,
              "low",
              "Organization not extracted for SAM lookup",
              "SAM-assisted matching is stronger when a legal business name is extracted from the support packet.",
              [args.fileName],
              "sam_reference_missing_org"
            )
          );
        }
        break;
      case "state_registration":
        if (!hasField(args.fields, "registrationId")) {
          findings.push(
            finding(
              `state-reg-id-${args.fileName}`,
              "medium",
              "Registration identifier missing",
              "The US registration-support document does not expose a clear state or business registration identifier.",
              [args.fileName],
              "state_registration_missing_id"
            )
          );
        }
        break;
      case "invoice_support":
        if (!hasField(args.fields, "invoiceId") || !hasField(args.fields, "amount")) {
          findings.push(
            finding(
              `invoice-support-${args.fileName}`,
              "medium",
              "Invoice support fields incomplete",
              "The invoice does not expose the full set of expected commercial anchors such as invoice id and amount.",
              [args.fileName],
              "invoice_support_incomplete"
            )
          );
        }
        break;
    }
  }

  return findings;
}
