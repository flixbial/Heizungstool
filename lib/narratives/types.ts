export type Role = "eigentuemer" | "vermieter" | "mieter";

export interface NarrativeInput {
  years: number;
  savings: number; // positiv = Vorteil WP
  totalFossil: number;
  payback: number | null; // Jahr der Amortisation (nur falls sinnvoll)
}

export interface NarrativeBlock {
  headline: string;
  short: string;
  detail: string;

  /** kurze „Beratungs“-Highlights (3 bullets) */
  highlights: string[];

  /** nächste Schritte (mehrere bullets) */
  nextSteps: string[];

  /** Beratungsschritte als Leitfaden (3–6 bullets) */
  advisorSteps: string[];
}