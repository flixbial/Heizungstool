export type Role = "eigentuemer" | "vermieter" | "mieter";

export type ReportTone = "positive" | "neutral" | "negative";

export interface ReportTextInput {
  years: number;
  savings: number; // >0 Vorteil WP, <0 Nachteil
  totalFossil: number;
  payback: number | null; // Jahre (nur wenn sinnvoll)
  extraInvest?: number;
  subsidyEuro?: number;
}

export interface ReportText {
  headline: string;
  intro: string; // 1–2 Sätze
  bullets: string[]; // Highlights
  recommendations: string[]; // Next steps
  disclaimer: string;
  tone: ReportTone;
}