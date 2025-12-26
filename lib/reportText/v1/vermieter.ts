import type { ReportText, ReportTextInput } from "../types";

function toneFromSavings(savings: number): "positive" | "neutral" | "negative" {
  if (savings > 500) return "positive";
  if (savings < -500) return "negative";
  return "neutral";
}

export function vermieterReportText_v1(input: ReportTextInput): ReportText {
  const { years, savings, payback, subsidyEuro = 0 } = input;
  const tone = toneFromSavings(savings);

  if (tone === "positive") {
    return {
      tone,
      headline: "Vermieterperspektive: Wärmepumpe verbessert die Gesamtkosten im Zeitraum.",
      intro:
        `Über ${years} Jahre ergibt sich ein Vorteil. ` +
        (payback ? `Amortisation grob nach ca. ${payback} Jahren.` : "Eine klare Amortisation ist im Zeitraum nicht sicher, dennoch ist der Trend positiv.") +
        (subsidyEuro > 0 ? " Förderung wirkt hier als relevanter Hebel." : ""),
      bullets: [
        "Reduktion CO₂-Kostenanteil (je nach Verteilung/Regelwerk) kann die Vermieterbilanz verbessern.",
        "Wartung/Anlagenbetrieb können günstiger und planbarer werden.",
        "Modernisierung kann Risiken (Ausfall, regulatorische Anforderungen) senken.",
      ],
      recommendations: [
        "Modernisierungsumlage/Weitergabe prüfen (rechtlich/strategisch – abhängig von Wohnraum, Markt, Regelungen).",
        "Technische Planung: Schallschutz, Hydraulik, Warmwasser, Spitzenlasten – früh klären.",
        "Mieterkommunikation vorbereiten: Zeitplan, Nutzen (Kosten/Komfort/CO₂), Baustellenablauf.",
      ],
      disclaimer:
        "Hinweis: Vereinfachtes Modell. Umlagefähigkeit, Betriebskostenverteilung und Rechtslage sind nicht abgebildet und müssen separat geprüft werden.",
    };
  }

  if (tone === "negative") {
    return {
      tone,
      headline: "Vermieterperspektive: Wirtschaftlichkeit ist nicht eindeutig – Stellhebel prüfen.",
      intro:
        `Über ${years} Jahre ergibt sich kein Vorteil. Häufig sind Investitionsniveau, Förderquote oder technische Rahmenbedingungen die Ursachen.`,
      bullets: [
        "Hohe Investitionskosten ohne ausreichende Förderquote drücken das Ergebnis.",
        "Effizienz (JAZ) und Systemtemperaturen sind zentral – besonders im Bestand.",
        "Rechts-/Umlagefragen können die Entscheidung stark beeinflussen.",
      ],
      recommendations: [
        "Förder- und Angebots-Optimierung: Varianten einholen, Förderkulisse prüfen, Losgrößen vergleichen.",
        "Technische Vorprüfung: Vorlauftemperaturen, Heizflächen, hydraulischer Abgleich, Warmwasser.",
        "Alternativpfade: Teilsanierung, Etappenplan (zuerst Hülle/Heizflächen, später WP).",
      ],
      disclaimer:
        "Hinweis: Vereinfachtes Modell. Umlagefähigkeit und rechtliche Rahmenbedingungen sind nicht berücksichtigt.",
    };
  }

  return {
    tone,
    headline: "Vermieterperspektive: Ergebnis ist knapp – Entscheidung hängt von Details ab.",
    intro:
      `Über ${years} Jahre liegen die Ergebnisse eng beieinander. Kleine Änderungen bei Förderung, Investition oder Effizienz können entscheidend sein.`,
    bullets: [
      "Förderung + Investition bestimmen die Vermieterbilanz stark.",
      "Technische Ausführung entscheidet über reale Effizienz und Betriebskosten.",
      "Kommunikation und Umsetzungsplan (Mieter/Handwerk) reduzieren Projektrisiko.",
    ],
    recommendations: [
      "Konservativ/optimistisch rechnen (z. B. JAZ ±0,3, Invest ±10%).",
      "Umsetzungsplan erstellen: Technik, Zeit, Kosten, Kommunikation.",
      "Bei Unsicherheit: objektbezogene Fachplanung/Heizlastberechnung beauftragen.",
    ],
    disclaimer:
      "Hinweis: Vereinfachtes Modell. Rechtliche und umlagebezogene Aspekte sind nicht Teil dieser Berechnung.",
  };
}