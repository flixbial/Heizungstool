import type { NarrativeBlock, NarrativeInput, Role } from "./types";
import { eigentuemerNarrative } from "./eigentuemer";
import { vermieterNarrative } from "./vermieter";
import { mieterNarrative } from "./mieter";

export type { NarrativeBlock, NarrativeInput, Role } from "./types";

export function getNarrative(role: Role, input: NarrativeInput): NarrativeBlock {
  if (role === "vermieter") return vermieterNarrative(input);
  if (role === "mieter") return mieterNarrative(input);
  return eigentuemerNarrative(input);
}