import type { ReportText, ReportTextInput } from "../types";
import { vermieterReportText_v1 } from "../v1/vermieter";
export function vermieterReportText_v2(input: ReportTextInput): ReportText {
  return vermieterReportText_v1(input);
}