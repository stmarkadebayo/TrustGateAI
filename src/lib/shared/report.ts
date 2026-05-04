import type { AnalysisFinding, ExportBundle, RiskBand } from "@/lib/shared/types";

function findingsMarkdown(findings: AnalysisFinding[]) {
  if (!findings.length) {
    return "_No findings._";
  }

  return findings
    .map(
      (finding) =>
        `### ${finding.title}\n- Severity: ${finding.severity}\n- Detail: ${finding.detail}\n- Evidence: ${finding.evidence.join("; ")}`
    )
    .join("\n\n");
}

export function createExportBundle(
  title: string,
  payload: unknown,
  sections: string[]
): ExportBundle {
  return {
    json: JSON.stringify(payload, null, 2),
    markdown: [`# ${title}`, ...sections].join("\n\n"),
  };
}

export function buildRiskBand(score: number): RiskBand {
  if (score >= 65) {
    return "high";
  }

  if (score >= 30) {
    return "medium";
  }

  return "low";
}

export function renderFindingsSection(findings: AnalysisFinding[]) {
  return `## Findings\n\n${findingsMarkdown(findings)}`;
}
