import { NarrativeBlock, NarrativeInput } from "./types";

export function eigentuemerNarrative(input: NarrativeInput): NarrativeBlock {
  const { years, savings, payback } = input;
  const abs = Math.abs(savings);
  const isAdvantage = savings > 0;
  const isNear = abs < 0.03 * Math.max(1, Math.abs(savings));

  return {
    headline: isNear
      ? "Ergebnis nahe am wirtschaftlichen Gleichstand"
      : isAdvantage
      ? "Wärmepumpe wirtschaftlich vorteilhaft"
      : "Wärmepumpe aktuell wirtschaftlich nachteilig",

    short: isNear
      ? `Über ${years} Jahre liegen die Gesamtkosten nahezu gleichauf. Kleine Änderungen bei Förderung, Strompreis oder JAZ können das Ergebnis kippen.`
      : isAdvantage
      ? `Als Selbstnutzer sparen Sie über ${years} Jahre voraussichtlich ${abs.toLocaleString("de-DE")} €.`
      : `Als Selbstnutzer entsteht über ${years} Jahre voraussichtlich ein Mehrkostenbetrag von ${abs.toLocaleString("de-DE")} €. `,

    detail: isNear
      ? `Das Ergebnis liegt nahe am Break-even. Entscheidende Einflussfaktoren sind die tatsächliche Jahresarbeitszahl, der Strompreis sowie die Höhe der Förderung.`
      : isAdvantage
      ? `Der wirtschaftliche Vorteil der Wärmepumpe ergibt sich vor allem aus niedrigeren laufenden Energiekosten und geringeren CO₂-Kosten im Vergleich zur fossilen Heizung.`
      : `Die Mehrinvestition der Wärmepumpe kann im betrachteten Zeitraum nicht vollständig durch niedrigere Betriebskosten ausgeglichen werden.`,

    nextSteps: [
      "Angebote einholen und reale JAZ prüfen (Heizkörper, Vorlauftemperatur).",
      "Fördermöglichkeiten final prüfen und Zuschuss absichern.",
      payback
        ? `Amortisation nach ca. ${payback} Jahren berücksichtigen.`
        : "Ergebnis mit alternativen Annahmen (Strompreis, Förderung) prüfen.",
    ],
  };
}
