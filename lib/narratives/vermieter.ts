import type { NarrativeBlock, NarrativeInput } from "./types";

function euro(v: number) {
  return Math.round(v).toLocaleString("de-DE") + " €";
}

export function vermieterNarrative(input: NarrativeInput): NarrativeBlock {
  const { years, savings, payback } = input;

  const positive = savings > 0;
  const neutral = Math.abs(savings) < 1;

  const headline = neutral
    ? "Vermieter-Perspektive: Kostenunterschied gering"
    : positive
    ? "Vermieter-Perspektive: Wärmepumpe reduziert Ihr Risiko / Ihre Kosten"
    : "Vermieter-Perspektive: Wärmepumpe aktuell nicht wirtschaftlich besser";

  const short = neutral
    ? `Aus Vermietersicht ist der Unterschied über ${years} Jahre gering. Entscheidend sind Planungssicherheit, Instandhaltung und CO₂-Risiko.`
    : positive
    ? `Über ${years} Jahre ergibt sich aus Vermietersicht ein Vorteil von ca. ${euro(savings)}.`
    : `Über ${years} Jahre ergibt sich aus Vermietersicht ein Nachteil von ca. ${euro(Math.abs(savings))}.`;

  const paybackText =
    payback && payback > 0 ? ` Amortisation der Mehrinvestition voraussichtlich im ${payback}. Jahr.` : "";

  const detail = positive
    ? `Die Wärmepumpe kann Wartungs-/Risikoanteile und CO₂-Kostenanteile senken.${paybackText} Für die Umsetzung ist saubere Kommunikation und ein geplanter Modernisierungsprozess entscheidend.`
    : `In diesem Szenario dominieren Investitionshöhe und Annahmen. Die Wärmepumpe ist nicht automatisch schlechter, aber die Wirtschaftlichkeit hängt stark von Förderung, JAZ und Gesamtkostenpaket ab.${paybackText}`;

  const highlights: string[] = [
    positive
      ? `Vorteil Vermieter: ~${euro(savings)} über ${years} Jahre`
      : neutral
      ? `Nahezu Gleichstand über ${years} Jahre`
      : `Nachteil Vermieter: ~${euro(Math.abs(savings))} über ${years} Jahre`,
    payback && payback > 0 ? `Amortisation: ca. im ${payback}. Jahr` : "Amortisation: nicht eindeutig / nicht erreicht",
    "Schwerpunkt: CAPEX, Instandhaltung, CO₂-Anteil & Planungssicherheit (Energie zahlt i. d. R. der Mieter)",
  ];

  const advisorSteps: string[] = [
    "Invest & Zeitplan: Modernisierung in Leerstand/Etappen denken, Aufwand im Objekt minimieren.",
    "Mieterkommunikation vorbereiten: Nutzen, Zeitplan, Zugänge, Lärm/Staub, Ansprechpartner.",
    "Förderung & Formalien: Förderweg, Nachweise, Fristen (vor Auftrag!), Dokumentation.",
    "Technikpaket sauber definieren: WP, Hydraulik, Heizflächen/Temperaturen, ggf. Warmwasser-Konzept.",
    "Betrieb/Monitoring: Wartungsvertrag, Regelung, Verbrauchsmonitoring zur Streitvermeidung.",
  ];

  const nextSteps: string[] = positive
    ? [
        "Budget & Angebotspaket festlegen (inkl. Nebenarbeiten) und 2–3 Angebote einholen.",
        "Förder- und Formalien-Check vor Beauftragung.",
        "Umsetzungsplan + Mieterkommunikation aufsetzen (Zeitfenster, Zugang, Ansprechpartner).",
      ]
    : [
        "Hebel prüfen: Förderung, Investitionspaket, JAZ (Temperaturniveau/Heizflächen).",
        "Alternativen/Etappen prüfen: Hybrid/Teilmaßnahmen, um CAPEX zu glätten.",
        "Wenn fossil bleibt: Risikomanagement (Wartung, Ersatzteilverfügbarkeit, CO₂-Anteil) dokumentieren.",
      ];

  return { headline, short, detail, highlights, nextSteps, advisorSteps };
}