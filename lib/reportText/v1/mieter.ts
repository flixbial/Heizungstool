import type { ReportText, ReportTextInput } from "../types";

function toneFromSavings(savings: number): "positive" | "neutral" | "negative" {
  if (savings > 200) return "positive";
  if (savings < -200) return "negative";
  return "neutral";
}

export function mieterReportText_v1(input: ReportTextInput): ReportText {
  const { years, savings } = input;
  const tone = toneFromSavings(savings);

  if (tone === "positive") {
    return {
      tone,
      headline: "Mieterperspektive: Laufende Kosten sind mit Wärmepumpe voraussichtlich niedriger.",
      intro: `Über ${years} Jahre ergibt sich ein Kostenvorteil bei den laufenden Ausgaben (Energie + CO₂-Anteil).`,
      bullets: [
        "Geringere laufende Kosten können die Warmmiete entlasten (abhängig von Umlagen).",
        "Weniger CO₂-Preisrisiko im Vergleich zu fossilen Energieträgern.",
        "Komfort/Regelung kann sich verbessern (objektabhängig).",
      ],
      recommendations: [
        "Nebenkostenlogik prüfen: Welche Kosten werden umgelegt, welche nicht?",
        "Bei Unsicherheit: Verbrauchsdaten der letzten Jahre als Realitätstest heranziehen.",
        "Bei Modernisierung: Baustellenablauf/Termine schriftlich klären.",
      ],
      disclaimer:
        "Hinweis: Vereinfachtes Modell. Umlagefähigkeit, Vertrags-/Nebenkostenregelungen und individuelle Nutzung beeinflussen reale Kosten.",
    };
  }

  if (tone === "negative") {
    return {
      tone,
      headline: "Mieterperspektive: Laufende Kosten sind mit Wärmepumpe hier nicht klar günstiger.",
      intro:
        `Über ${years} Jahre ergibt sich kein Kostenvorteil bei den laufenden Ausgaben. Ursache sind oft Strompreisannahmen oder Effizienz.`,
      bullets: [
        "Strompreis und reale Effizienz (JAZ) sind entscheidend.",
        "Umlage- und Vertragsregeln können die Wahrnehmung der Kosten verändern.",
        "Reale Nutzung (Temperatur, Lüftung) beeinflusst das Ergebnis stark.",
      ],
      recommendations: [
        "Annahmen prüfen: Strompreis, Heizwärmebedarf, reale Systemtemperaturen.",
        "Transparenz anfordern: Messkonzept, Abrechnung, erwartete Verbräuche.",
        "Gespräch über Maßnahmen führen: Optimierung der Regelung, hydraulischer Abgleich, Dämmung.",
      ],
      disclaimer:
        "Hinweis: Vereinfachtes Modell. Individuelle Vertrags- und Abrechnungsmodelle sind nicht abgebildet.",
    };
  }

  return {
    tone,
    headline: "Mieterperspektive: Ergebnis ist knapp – kleine Änderungen entscheiden.",
    intro:
      `Über ${years} Jahre liegen die laufenden Kosten nah beieinander. In der Praxis entscheiden Messkonzept, Effizienz und Preisentwicklung.`,
    bullets: [
      "Geringe Unterschiede können sich je nach Winter/Witterung verändern.",
      "Effizienz hängt an Systemtemperaturen und Anlagenqualität.",
      "Transparente Abrechnung ist entscheidend für Akzeptanz.",
    ],
    recommendations: [
      "Reale Verbräuche vergleichen (Vorher/Nachher), idealerweise witterungsbereinigt.",
      "Abrechnung und Umlageschlüssel prüfen lassen (Hausverwaltung/Vermieter).",
      "Optimierungen anregen: Heizkurve, hydraulischer Abgleich, Thermostate/Regelung.",
    ],
    disclaimer:
      "Hinweis: Vereinfachtes Modell. Individuelle Nutzung und Abrechnung bestimmen die realen Kosten.",
  };
}