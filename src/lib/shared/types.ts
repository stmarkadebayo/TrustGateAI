export type Severity = "low" | "medium" | "high";

export type RiskBand = "low" | "medium" | "high";

export type ResultStatus =
  | "ok"
  | "needs_mapping"
  | "pass"
  | "review"
  | "fail"
  | "insufficient_support"
  | "error";

export type ExportBundle = {
  json: string;
  markdown: string;
};

export type AnalysisFinding = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  evidence: string[];
  ruleId?: string;
};

export type AnalysisSummary = {
  title: string;
  detail: string;
  riskBand?: RiskBand;
  status: ResultStatus;
};

export type AINote = {
  enabled: boolean;
  content: string;
  mode: "provider" | "fallback";
};

export type BaseResult = {
  status: ResultStatus;
  summary: AnalysisSummary;
  findings: AnalysisFinding[];
  aiNotes: AINote;
  limitations: string[];
  exports: ExportBundle;
};
