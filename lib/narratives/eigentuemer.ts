import type { NarrativeBlock, NarrativeInput } from "./types";

function euro(v: number) {
  return Math.round(v).toLocaleString("de-DE") + " €";
}

export function eigentuemerNarrative(input: NarrativeInput): NarrativeBlock {
  const { years, savings, totalFossil, payback } = input;

  const positive = savings > 0;
  const neutral = Math.abs(savings) < 1;

  const headline = neutral
    ? "Wärmepumpe und Fossil liegen wirtschaftlich nah beieinander"
    : positive
    ? "Wärmepumpe ist wirtschaftlich vorteilhaft"
    : "Fossil ist in diesem Szenario wirtschaftlich im Vorteil";

  const short = neutral
    ? `Über ${years} Jahre ist der Kostenunterschied gering. Entscheidend sind Komfort, CO₂ und zukünftige Preisentwicklung.`
    : positive
    ? `Über ${years} Jahre ergibt sich ein Vorteil von ca. ${euro(savings)} gegenüber fossil.`
    : `Über ${years} Jahre ergibt sich ein Nachteil von ca. ${euro(Math.abs(savings))} gegenüber fossil.`;

  const paybackText =
    payback && payback > 0 ? ` Die Mehrinvestition amortisiert sich voraussichtlich im ${payback}. Jahr.` : "";

  const detail = positive
    ? `Die Wärmepumpe senkt die Gesamtkosten vor allem durch geringere laufende Kosten und reduziert das CO₂-Preisrisiko.${paybackText}`
    : `Die Wärmepumpe ist in diesem Szenario (noch) nicht wirtschaftlich besser. Haupttreiber sind Investitionshöhe, Strompreis und JAZ.${paybackText}`;

  const highlights: string[] = [
    positive
      ? `Wirtschaftlicher Vorteil: ~${euro(savings)} über ${years} Jahre`
      : neutral
      ? `Wirtschaftlich: nahezu Gleichstand über ${years} Jahre`
      : `Wirtschaftlicher Nachteil: ~${euro(Math.abs(savings))} über ${years} Jahre`,
    payback && payback > 0 ? `Amortisation: ca. im ${payback}. Jahr` : "Amortisation: nicht eindeutig / nicht erreicht",
    `Risikofaktor: Energiepreise & CO₂-Preis (fossil stärker betroffen)`,
  ];

  const advisorSteps: string[] = [
    "Heizlast & Systemcheck: Vorlauftemperaturen, Hydraulik, Heizflächen prüfen (entscheidet über JAZ).",
    "Angebote einholen: WP inkl. Installation, Nebenarbeiten, Elektro/Netz, ggf. Speicher; Vergleich nach Leistungsumfang.",
    "Förderung final klären: Förderquote/Deckel, notwendige Nachweise und Zeitplan vor Auftrag.",
    "Betrieb optimieren: Stromtarif (WP-Tarif), Regelung/Heizkurve, hydraulischer Abgleich.",
    "Optional: PV-Integration prüfen (Eigenstrom kann Wirtschaftlichkeit deutlich verbessern).",
  ];

  const nextSteps: string[] = positive
    ? [
        "Mit 1–2 Angeboten plausibilisieren (Invest & JAZ-Annahmen).",
        "Hydraulischer Abgleich und Heizkurve als Pflichtpunkt aufnehmen.",
        "Förderung/Antragsweg festzurren, dann Umsetzung planen.",
      ]
    : [
        "Hebel prüfen: Invest senken, Förderung erhöhen, JAZ verbessern (z. B. Heizflächen/Temperaturniveau).",
        "Stromtarif/PV-Option bewerten, da Betriebskosten entscheidend sind.",
        "Wenn fossil bleibt: Effizienzmaßnahmen (Regelung, Dämmung, Wartung) zur Risikoreduktion planen.",
      ];

  // Zusatz: Wenn fossil extrem teuer -> sanfte Motivation
  const fossilShare = totalFossil > 0 ? savings / totalFossil : 0;
  if (positive && fossilShare > 0.15) {
    nextSteps.unshift("Der Vorteil ist signifikant – zeitnah Angebote einholen, um Preisrisiken zu reduzieren.");
  }

  return { headline, short, detail, highlights, nextSteps, advisorSteps };
}