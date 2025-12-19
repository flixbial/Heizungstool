export type NarrativeLevel = "short" | "detail";

export interface NarrativeInput {
  years: number;
  savings: number;
  totalFossil: number;
  payback: number | null;
}

export interface NarrativeBlock {
  headline: string;
  short: string;
  detail: string;
  nextSteps: string[];
}
