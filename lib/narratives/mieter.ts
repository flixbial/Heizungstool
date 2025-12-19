import { NarrativeBlock, NarrativeInput } from "./types";

export function mieterNarrative(input: NarrativeInput): NarrativeBlock {
  const { years, savings } = input;
  const abs = Math.abs(savings);
  const monatlich = abs / (years * 12);
  const isAdvantage = savings > 0;

  return {
    headline: isAdvantage
      ? "Geringere laufende Kosten durch Wärmepumpe"
      : "Höhere laufende Kosten durch Wärmepumpe",

    short: isAdvantage
      ? `Die laufenden Kosten sinken über ${years} Jahre um rund ${abs.toLocaleString(
          "de-DE"
        )} € (≈ ${monatlich.toFixed(0)} €/Monat).`
      : `Die laufenden Kosten steigen über ${years} Jahre um rund ${abs.toLocaleString(
          "de-DE"
        )} € (≈ ${monatlich.toFixed(0)} €/Monat).`,

    detail:
      "Bewertet werden ausschließlich laufende Kosten (Energie und CO₂-Anteil). Investitionskosten werden in der Mieterperspektive nicht berücksichtigt.",

    nextSteps: [
      "Strom- und Brennstoffpreise vergleichen.",
      "Reale JAZ und Heizverhalten berücksichtigen.",
      "Nebenkosten- und Umlageeffekte klären.",
    ],
  };
}
