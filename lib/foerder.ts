export type FoerderArt = "wohn" | "nichtwohn";

export interface FoerderInput {
  art: FoerderArt;
  invest: number;
  area: number;
  units: number;
  wohnKlimaBonus: boolean;
  wohnEinkommensBonus: boolean;
  wohnEffizienzBonus: boolean;
  nwgEffizienzBonus: boolean;
}

export interface FoerderResult {
  art: FoerderArt;
  invest: number;
  foerderProzent: number;
  foerderEuro: number;
  restInvest: number;
  begrenztAuf: number | null;
  kostenobergrenze: number | null;
  foerderhoechstbetragNWG: number | null;
}

function getWohnGebaeudeKostenobergrenze(unitsRaw: number): number {
  let units = unitsRaw;
  if (!isFinite(units) || units <= 0) units = 1;

  if (units <= 1) {
    return 30000;
  } else if (units <= 6) {
    return 30000 + (units - 1) * 15000;
  } else {
    return 30000 + 5 * 15000 + (units - 6) * 8000;
  }
}

function getNwgFoerderhoechstbetrag(area: number): number {
  if (!isFinite(area) || area <= 0) return 0;

  let foerderhoechst = 30000;
  if (area > 150) {
    const a = Math.min(area, 400) - 150;
    foerderhoechst += a * 200;
  }
  if (area > 400) {
    const a = Math.min(area, 1000) - 400;
    foerderhoechst += a * 120;
  }
  if (area > 1000) {
    const a = area - 1000;
    foerderhoechst += a * 80;
  }
  return foerderhoechst;
}

export function calculateFoerder(input: FoerderInput): FoerderResult {
  const { art } = input;
  const invest = input.invest;
  if (!isFinite(invest) || invest <= 0) {
    throw new Error("Ungültige Investitionssumme");
  }

  let foerderProzent = 0;
  let foerderEuro = 0;
  let begrenztAuf: number | null = null;
  let kostenobergrenze: number | null = null;
  let foerderhoechstbetragNWG: number | null = null;

  if (art === "wohn") {
    foerderProzent = 30;
    if (input.wohnKlimaBonus) foerderProzent += 20;
    if (input.wohnEinkommensBonus) foerderProzent += 30;
    if (input.wohnEffizienzBonus) foerderProzent += 5;
    if (foerderProzent > 70) foerderProzent = 70;

    kostenobergrenze = getWohnGebaeudeKostenobergrenze(input.units);
    const bemessungsGrundlage = Math.min(invest, kostenobergrenze);
    if (bemessungsGrundlage < invest) {
      begrenztAuf = bemessungsGrundlage;
    }
    foerderEuro = bemessungsGrundlage * foerderProzent / 100;
  } else {
    foerderProzent = 30;
    if (input.nwgEffizienzBonus) foerderProzent += 5;
    foerderhoechstbetragNWG = getNwgFoerderhoechstbetrag(input.area);
    const bemessungsGrundlage = Math.min(invest, foerderhoechstbetragNWG);
    if (bemessungsGrundlage < invest) {
      begrenztAuf = bemessungsGrundlage;
    }
    foerderEuro = bemessungsGrundlage * foerderProzent / 100;
  }

  const restInvest = invest - foerderEuro;

  return {
    art,
    invest,
    foerderProzent,
    foerderEuro,
    restInvest,
    begrenztAuf,
    kostenobergrenze,
    foerderhoechstbetragNWG,
  };
}
