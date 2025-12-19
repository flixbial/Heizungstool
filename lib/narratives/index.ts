import { NarrativeInput } from "./types";
import { eigentuemerNarrative } from "./eigentuemer";
import { vermieterNarrative } from "./vermieter";
import { mieterNarrative } from "./mieter";

export function getNarrative(
  role: "eigentuemer" | "vermieter" | "mieter",
  input: NarrativeInput
) {
  switch (role) {
    case "vermieter":
      return vermieterNarrative(input);
    case "mieter":
      return mieterNarrative(input);
    default:
      return eigentuemerNarrative(input);
  }
}
