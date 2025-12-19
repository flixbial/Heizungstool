import { NarrativeBlock, NarrativeInput } from "./types";

export function vermieterNarrative(input: NarrativeInput): NarrativeBlock {
  const { years, savings, payback } = input;
  const abs = Math.abs(savings);
  const isAdvantage = savings > 0;

  return {
    headline: isAdvantage
      ? "Wärmepumpe aus Vermietersicht wirtschaftlich sinnvoll"
      : "Wärmepumpe aus Vermietersicht aktuell wirtschaftlich nachteilig",

    short: isAdvantage
      ? `Aus Vermietersicht ergibt sich über ${years} Jahre ein wirtschaftlicher Vorteil von rund ${abs.toLocaleString("de-DE")} €.`
      : `Aus Vermietersicht ergibt sich über ${years} Jahre ein wirtschaftlicher Nachteil von rund ${abs.toLocaleString("de-DE")} €.`,

    detail:
      "Berücksichtigt werden Investition, Wartung sowie der Vermieteranteil der CO₂-Kosten. Energiekosten werden in dieser Perspektive nicht angesetzt.",

    nextSteps: [
      "Förderquote und Kostenobergrenzen prüfen.",
      "Investitionsannahmen mit Angeboten absichern.",
      payback
        ? `Amortisation nach ca. ${payback} Jahren einplanen.`
        : "Wirtschaftlichkeit mit alternativen Szenarien prüfen.",
    ],
  };
}
