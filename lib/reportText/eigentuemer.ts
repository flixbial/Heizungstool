import type { ReportText, ReportTextInput } from "./types";

function toneFromSavings(savings: number): "positive" | "neutral" | "negative" {
  if (savings > 500) return "positive";
  if (savings < -500) return "negative";
  return "neutral";
}

function paybackText(payback: number | null) {
  if (!payback) return "Keine klare Amortisation im Betrachtungszeitraum";
  if (payback <= 10) return `Amortisation voraussichtlich nach ca. ${payback} Jahren`;
  if (payback <= 15) return `Amortisation voraussichtlich nach ca. ${payback} Jahren (mittel)`;
  return `Amortisation voraussichtlich nach ca. ${payback} Jahren (lang)`;
}

export function eigentuemerReportText(input: ReportTextInput): ReportText {
  const { years, savings, payback, subsidyEuro = 0 } = input;
  const tone = toneFromSavings(savings);

  if (tone === "positive") {
    return {
      tone,
      headline: "Die Wärmepumpe ist in dieser Betrachtung wirtschaftlich vorteilhaft.",
      intro:
        `Über ${years} Jahre ergibt sich ein wirtschaftlicher Vorteil gegenüber der fossilen Lösung. ` +
        `${paybackText(payback)}.` +
        (subsidyEuro > 0 ? " Die angesetzte Förderung verbessert die Wirtschaftlichkeit deutlich." : ""),
      bullets: [
        "Geringere laufende Kosten reduzieren die Gesamtkosten im Zeitverlauf.",
        "Planbarkeit: weniger Abhängigkeit von fossilen Preis- und CO₂-Risiken.",
        "Förderung + Effizienz (JAZ) sind die stärksten Hebel im Ergebnis.",
      ],
      recommendations: [
        "Angebot(e) mit hydraulischem Abgleich, Pufferspeicher/Regelung und Heizflächenprüfung einholen.",
        "JAZ realistisch absichern: Vorlauftemperaturen prüfen, Heizkurve optimieren, ggf. Heizflächen erweitern.",
        "Fördervoraussetzungen checken (Fristen, Fachunternehmererklärung, Nachweise).",
      ],
      disclaimer:
        "Hinweis: Vereinfachtes Modell. Ergebnisse hängen stark von realen Verbrauchsdaten, Anlagenparametern, Preisen und Förderbedingungen ab.",
    };
  }

  if (tone === "negative") {
    return {
      tone,
      headline: "Die Wärmepumpe ist in dieser Konstellation aktuell nicht klar wirtschaftlich.",
      intro:
        `Über ${years} Jahre ergibt sich kein wirtschaftlicher Vorteil gegenüber der fossilen Lösung. ` +
        "Oft sind die Ursachen ein hoher Strompreis, eine zu niedrige JAZ oder hohe Investitionskosten.",
      bullets: [
        "Wirtschaftlichkeit kippt häufig über JAZ (Effizienz) und Investitionsniveau.",
        "Förderung kann das Ergebnis verbessern – ist aber nicht immer ausreichend.",
        "Technische Optimierungen (Vorlauftemperatur, Heizflächen) sind oft entscheidend.",
      ],
      recommendations: [
        "Sensitivitäten prüfen: JAZ +0,5, Strompreis −5 ct/kWh, Investition −10–15% – wie verändert sich das Ergebnis?",
        "Technische Machbarkeit klären (Vorlauftemperaturen, Heizkörper/Flächen, Dämmstand).",
        "Alternative Maßnahmen priorisieren: Gebäudehülle, Regelung, Hybrid-/Zwischenlösung, späterer Wechsel.",
      ],
      disclaimer:
        "Hinweis: Vereinfachtes Modell. Ergebnisse sind indikativ und ersetzen keine Fachplanung oder verbindliche Angebote.",
    };
  }

  return {
    tone,
    headline: "Die Entscheidung ist knapp – Details und Annahmen sind ausschlaggebend.",
    intro:
      `Über ${years} Jahre liegen die Ergebnisse nah beieinander. ` +
      "In solchen Fällen entscheiden oft reale Lastprofile, JAZ in der Praxis und Preisannahmen.",
    bullets: [
      "Kleine Änderungen bei Strompreis, JAZ oder Investition können die Empfehlung umdrehen.",
      "Förderung und Ausführung (Hydraulik/Regelung) beeinflussen die Praxiswerte stark.",
      "CO₂- und Preisrisiken fossil sind schwer prognostizierbar.",
    ],
    recommendations: [
      "Annahmen validieren: reale Heizkosten, Verbrauch, Vorlauftemperaturen, Anlagenzustand.",
      "Zwei Varianten kalkulieren (konservativ vs. optimistisch) und Entscheidung danach treffen.",
      "Falls Sanierung geplant: Maßnahmen kombinieren (z. B. Dämmung + WP) und erneut rechnen.",
    ],
    disclaimer:
      "Hinweis: Vereinfachtes Modell. Für eine belastbare Entscheidung sind Objektbegehung, Planung und Angebote erforderlich.",
  };
}