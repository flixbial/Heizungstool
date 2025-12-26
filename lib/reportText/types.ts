export type Role = "eigentuemer" | "vermieter" | "mieter";

export type ReportTone = "positive" | "neutral" | "negative";

/** Auswahl im UI */
export type ReportVariant = "kurz" | "standard" | "detailliert";

export interface ReportTextInput {
  years: number;
  savings: number;
  totalFossil: number;
  payback: number | null;
  extraInvest?: number;
  subsidyEuro?: number;
}

export interface ReportText {
  headline: string;
  intro: string;
  bullets: string[];
  recommendations: string[];
  disclaimer: string;
  tone: ReportTone;
}