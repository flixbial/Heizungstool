import type { Role, ReportText, ReportTextInput, ReportVariant } from "./types";

import { eigentuemerReportText_v1 } from "./v1/eigentuemer";
import { vermieterReportText_v1 } from "./v1/vermieter";
import { mieterReportText_v1 } from "./v1/mieter";

import { eigentuemerReportText_v2 } from "./v2/eigentuemer";
import { vermieterReportText_v2 } from "./v2/vermieter";
import { mieterReportText_v2 } from "./v2/mieter";

function pickByRole(
  role: Role,
  f: {
    eigentuemer: (i: ReportTextInput) => ReportText;
    vermieter: (i: ReportTextInput) => ReportText;
    mieter: (i: ReportTextInput) => ReportText;
  },
  input: ReportTextInput
) {
  if (role === "vermieter") return f.vermieter(input);
  if (role === "mieter") return f.mieter(input);
  return f.eigentuemer(input);
}

/**
 * variant:
 * - kurz: v1, aber Bullet/Steps reduziert
 * - standard: v1 vollständig
 * - detailliert: v2 (zunächst = v1, später ausbauen)
 */
export function getReportText(role: Role, input: ReportTextInput, variant: ReportVariant = "standard") {
  const base =
    variant === "detailliert"
      ? pickByRole(
          role,
          { eigentuemer: eigentuemerReportText_v2, vermieter: vermieterReportText_v2, mieter: mieterReportText_v2 },
          input
        )
      : pickByRole(
          role,
          { eigentuemer: eigentuemerReportText_v1, vermieter: vermieterReportText_v1, mieter: mieterReportText_v1 },
          input
        );

  if (variant === "kurz") {
    return {
      ...base,
      bullets: base.bullets.slice(0, 2),
      recommendations: base.recommendations.slice(0, 2),
    };
  }

  return base;
}