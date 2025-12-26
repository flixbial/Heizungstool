import type { ReportText, ReportTextInput } from "../types";
import { eigentuemerReportText_v1 } from "../v1/eigentuemer";

/** Start: v2 = v1. Später hier ausführlicher machen. */
export function eigentuemerReportText_v2(input: ReportTextInput): ReportText {
  return eigentuemerReportText_v1(input);
}