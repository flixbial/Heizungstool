import type { NarrativeBlock, NarrativeInput } from "./types";

function euro(v: number) {
  return Math.round(v).toLocaleString("de-DE") + " €";
}

export function mieterNarrative(input: NarrativeInput): NarrativeBlock {
  const { years, savings } = input;

  const positive = savings > 0;
  const neutral = Math.abs(savings) < 1;

  const headline = neutral
    ? "Mieter-Perspektive: Laufende Kosten nahezu gleich"
    : positive
    ? "Mieter-Perspektive: Wärmepumpe senkt Ihre laufenden Kosten"
    : "Mieter-Perspektive: Fossil ist in diesem Szenario bei den laufenden Kosten günstiger";

  const short = neutral
    ? `Über ${years} Jahre ist der Unterschied klein. Wichtig sind Komfort, Preissicherheit und CO₂-Risiko.`
    : positive
    ? `Über ${years} Jahre ergibt sich ein Vorteil von ca. ${euro(savings)} bei den laufenden Kosten.`
    : `Über ${years} Jahre ergibt sich ein Nachteil von ca. ${euro(Math.abs(savings))} bei den laufenden Kosten.`;

  const detail = positive
    ? "Als Mieter profitieren Sie vor allem über die Energiekosten. Zusätzlich sinkt das Risiko steigender CO₂-Kosten bei fossil."
    : "Als Mieter zählt vor allem der Energiepreis und der CO₂-Anteil. In diesem Szenario wirkt fossil günstiger – das kann sich bei Preisänderungen aber drehen.";

  const highlights: string[] = [
    positive
      ? `Vorteil laufende Kosten: ~${euro(savings)} über ${years} Jahre`
      : neutral
      ? `Nahezu Gleichstand über ${years} Jahre`
      : `Nachteil laufende Kosten: ~${euro(Math.abs(savings))} über ${years} Jahre`,
    "Wichtig: Investition ist Vermieterthema – hier zählt die Betriebskosten-Perspektive",
    "Hebel: Tarif, Verbrauch, Regelung, Kommunikation mit Vermieter",
  ];

  const advisorSteps: string[] = [
    "Verbrauch verstehen: Abrechnungen prüfen, realen kWh-Verbrauch und Raumtemperaturen erfassen.",
    "Tarife prüfen: Strom-/Gas-/Öl-Preisniveau und Wechseloptionen (sofern möglich).",
    "Gesprächsgrundlage schaffen: Ergebnis als Argumentation für Modernisierung/Optimierung nutzen.",
    "Komfort/Schimmel vermeiden: bei Optimierungen immer mit Lüftungs-/Heizverhalten abgleichen.",
  ];

  const nextSteps: string[] = positive
    ? [
        "Ergebnis als Gesprächsgrundlage nutzen (Modernisierung kann Betriebskosten senken).",
        "Tarife prüfen und Einsparpotenziale im Betrieb identifizieren.",
        "Bei Umsetzung: auf saubere Einregulierung/Heizkurve achten (sonst sinkt JAZ).",
      ]
    : [
        "Tarife/Verbrauch prüfen – kleine Änderungen können den Unterschied drehen.",
        "Mit Vermieter über Optimierung sprechen (Regelung, Thermostatventile, Abgleich).",
        "Wenn Modernisierung geplant: Einregulierung/Monitoring als Qualitätskriterium einfordern.",
      ];

  return { headline, short, detail, highlights, nextSteps, advisorSteps };
}