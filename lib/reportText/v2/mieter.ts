import type { ReportText, ReportTextInput } from "../types";
import { mieterReportText_v1 } from "../v1/mieter";
export function mieterReportText_v2(input: ReportTextInput): ReportText {
  return mieterReportText_v1(input);
}