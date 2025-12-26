import type { Role, ReportText, ReportTextInput } from "./types";
import { eigentuemerReportText } from "./eigentuemer";
import { vermieterReportText } from "./vermieter";
import { mieterReportText } from "./mieter";

export function getReportText(role: Role, input: ReportTextInput): ReportText {
  if (role === "vermieter") return vermieterReportText(input);
  if (role === "mieter") return mieterReportText(input);
  return eigentuemerReportText(input);
}