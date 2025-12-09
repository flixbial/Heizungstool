export type CarrierFossil = "Erdgas" | "Flüssiggas" | "Heizöl" | "Pellets";
export type CarrierHP = "Strom Stromix" | "Strom Erneuerbar";
export type ScenarioName =
  | "Sehr niedrig"
  | "Niedrig"
  | "Experten"
  | "Hoch"
  | "Sehr hoch";

export interface CalcInput {
  heatDemand: number;
  area: number;
  units: number;
  years: number;
  scenario: ScenarioName;
  carrierFossil: CarrierFossil;
  carrierHP: CarrierHP;
  investFossil: number;
  effFossil: number; // %
  priceFossil0: number;
  incFossil: number; // %/a
  maintFossil: number;
  investHP: number;
  subsidyHP: number;
  jaz: number;
  priceEl0: number;
  incEl: number; // %/a
  maintHP: number;
}

export interface YearRow {
  year: number;
  co2Price: number;
  landlordShareFossil: number;
  landlordShareHP: number;
  costFossil: number;
  costHP: number;
  delta: number;
  cumSavings: number;
}

export interface CalcResult {
  extraInvest: number;
  paybackYear: number | null;
  totalFossil: number;
  totalHP: number;
  savings: number;
  co2FossilKgPerM2: number;
  co2HPKgPerM2: number;
  landlordShareFossilStatic: number;
  landlordShareHPStatic: number;
  rows: YearRow[];
  cumFossil: number[];
  cumHP: number[];
}

const EMISSION_FACTORS: Record<string, number> = {
  "Erdgas": 0.201,
  "Flüssiggas": 0.239,
  "Heizöl": 0.266,
  "Strom Stromix": 0.107,
  "Strom Erneuerbar": 0.0,
  "Pellets": 0.036
};

const SCENARIO_PRICES: Record<ScenarioName, { year: number; price: number }[]> = {
  "Sehr niedrig": [
    { year: 2024, price: 45.0 },
    { year: 2025, price: 55.0 },
    { year: 2026, price: 57.0 },
    { year: 2027, price: 59.0 },
    { year: 2028, price: 61.0 },
    { year: 2029, price: 63.0 },
    { year: 2030, price: 65.0 },
    { year: 2031, price: 67.0 },
    { year: 2032, price: 69.0 },
    { year: 2033, price: 71.0 },
    { year: 2034, price: 73.0 },
    { year: 2035, price: 75.0 },
    { year: 2036, price: 77.0 },
    { year: 2037, price: 79.0 },
    { year: 2038, price: 81.0 },
    { year: 2039, price: 83.0 },
    { year: 2040, price: 85.0 },
    { year: 2041, price: 87.0 },
    { year: 2042, price: 89.0 },
    { year: 2043, price: 91.0 },
    { year: 2044, price: 93.0 }
  ],
  "Niedrig": [
    { year: 2024, price: 45.0 },
    { year: 2025, price: 55.0 },
    { year: 2026, price: 60.0 },
    { year: 2027, price: 65.0 },
    { year: 2028, price: 70.0 },
    { year: 2029, price: 75.0 },
    { year: 2030, price: 80.0 },
    { year: 2031, price: 85.0 },
    { year: 2032, price: 90.0 },
    { year: 2033, price: 95.0 },
    { year: 2034, price: 100.0 },
    { year: 2035, price: 105.0 },
    { year: 2036, price: 110.0 },
    { year: 2037, price: 115.0 },
    { year: 2038, price: 120.0 },
    { year: 2039, price: 125.0 },
    { year: 2040, price: 130.0 },
    { year: 2041, price: 135.0 },
    { year: 2042, price: 140.0 },
    { year: 2043, price: 145.0 },
    { year: 2044, price: 150.0 }
  ],
  "Experten": [
    { year: 2024, price: 45.0 },
    { year: 2025, price: 55.0 },
    { year: 2026, price: 67.5 },
    { year: 2027, price: 80.0 },
    { year: 2028, price: 92.5 },
    { year: 2029, price: 105.0 },
    { year: 2030, price: 117.5 },
    { year: 2031, price: 130.0 },
    { year: 2032, price: 142.5 },
    { year: 2033, price: 155.0 },
    { year: 2034, price: 167.5 },
    { year: 2035, price: 180.0 },
    { year: 2036, price: 192.5 },
    { year: 2037, price: 205.0 },
    { year: 2038, price: 217.5 },
    { year: 2039, price: 230.0 },
    { year: 2040, price: 242.5 },
    { year: 2041, price: 255.0 },
    { year: 2042, price: 267.5 },
    { year: 2043, price: 280.0 },
    { year: 2044, price: 292.5 }
  ],
  "Hoch": [
    { year: 2024, price: 45.0 },
    { year: 2025, price: 55.0 },
    { year: 2026, price: 72.5 },
    { year: 2027, price: 90.0 },
    { year: 2028, price: 107.5 },
    { year: 2029, price: 125.0 },
    { year: 2030, price: 142.5 },
    { year: 2031, price: 160.0 },
    { year: 2032, price: 177.5 },
    { year: 2033, price: 195.0 },
    { year: 2034, price: 212.5 },
    { year: 2035, price: 230.0 },
    { year: 2036, price: 247.5 },
    { year: 2037, price: 265.0 },
    { year: 2038, price: 282.5 },
    { year: 2039, price: 300.0 },
    { year: 2040, price: 317.5 },
    { year: 2041, price: 335.0 },
    { year: 2042, price: 352.5 },
    { year: 2043, price: 370.0 },
    { year: 2044, price: 387.5 }
  ],
  "Sehr hoch": [
    { year: 2024, price: 45.0 },
    { year: 2025, price: 55.0 },
    { year: 2026, price: 77.5 },
    { year: 2027, price: 100.0 },
    { year: 2028, price: 122.5 },
    { year: 2029, price: 145.0 },
    { year: 2030, price: 167.5 },
    { year: 2031, price: 190.0 },
    { year: 2032, price: 212.5 },
    { year: 2033, price: 235.0 },
    { year: 2034, price: 257.5 },
    { year: 2035, price: 280.0 },
    { year: 2036, price: 302.5 },
    { year: 2037, price: 325.0 },
    { year: 2038, price: 347.5 },
    { year: 2039, price: 370.0 },
    { year: 2040, price: 392.5 },
    { year: 2041, price: 415.0 },
    { year: 2042, price: 437.5 },
    { year: 2043, price: 460.0 },
    { year: 2044, price: 482.5 }
  ],
};

function getScenarioPriceArray(scenario: ScenarioName, years: number): number[] {
  const data = SCENARIO_PRICES[scenario] || [];
  const prices: number[] = [];
  const baseYear = new Date().getFullYear();

  // Falls keine Daten existieren → fülle mit 0
  if (data.length === 0) {
    return Array.from({ length: years }, () => 0);
  }

  for (let i = 0; i < years; i++) {
    const year = baseYear + i;

    // passenden Eintrag suchen
    let entry = data.find((e) => e.year === year);

    // wenn keiner existiert, nimm den letzten gültigen Eintrag
    if (!entry) {
      entry = data[data.length - 1];  // garantiert {year, price}
    }

    prices.push(entry.price);
  }

  return prices;
}

function landlordShareFromSpecificEmissions(kgPerM2a: number): number {
  if (kgPerM2a < 12) return 0.0;
  if (kgPerM2a < 17) return 0.10;
  if (kgPerM2a < 22) return 0.20;
  if (kgPerM2a < 27) return 0.30;
  if (kgPerM2a < 32) return 0.40;
  if (kgPerM2a < 37) return 0.50;
  if (kgPerM2a < 42) return 0.60;
  if (kgPerM2a < 47) return 0.70;
  if (kgPerM2a < 52) return 0.80;
  return 0.90;
}

export function calculate(input: CalcInput): CalcResult {
  const years = Math.max(1, Math.round(input.years || 1));
  const area = input.area > 0 ? input.area : 100;

  const co2Prices = getScenarioPriceArray(input.scenario, years);
  const currentYear = new Date().getFullYear();

  const effFossil = input.effFossil / 100;
  const incFossil = input.incFossil / 100;
  const incEl = input.incEl / 100;

  const co2FactorFossil = EMISSION_FACTORS[input.carrierFossil] ?? 0;
  const co2FactorStrom = EMISSION_FACTORS[input.carrierHP] ?? 0;

  const endEnergyFossil = effFossil > 0 ? input.heatDemand / effFossil : 0;
  const elEnergyHP = input.jaz > 0 ? input.heatDemand / input.jaz : 0;

  const emFossilTonsYear = (endEnergyFossil * co2FactorFossil) / 1000;
  const emHPTonsYear = (elEnergyHP * co2FactorStrom) / 1000;

  const co2FossilKgPerM2 = area > 0 ? (emFossilTonsYear * 1000) / area : 0;
  const co2HPKgPerM2 = area > 0 ? (emHPTonsYear * 1000) / area : 0;

  const landlordShareFossilStatic = landlordShareFromSpecificEmissions(co2FossilKgPerM2);
  const landlordShareHPStatic = landlordShareFromSpecificEmissions(co2HPKgPerM2);

  const extraInvest = (input.investHP - input.subsidyHP) - input.investFossil;

  const cumFossil: number[] = [];
  const cumHP: number[] = [];
  let cumFossilTmp = input.investFossil;
  let cumHPTmp = input.investHP - input.subsidyHP;
  let cumSavings = 0;

  const rows: YearRow[] = [];

  for (let y = 0; y < years; y++) {
    const yearLabel = currentYear + y;

    const priceFossilYear = input.priceFossil0 * Math.pow(1 + incFossil, y);
    const priceElYear = input.priceEl0 * Math.pow(1 + incEl, y);

    const fuelCostFossil = endEnergyFossil * priceFossilYear;
    const fuelCostHP = elEnergyHP * priceElYear;

    const emFossilTons = (endEnergyFossil * co2FactorFossil) / 1000;
    const emHPTons = (elEnergyHP * co2FactorStrom) / 1000;

    const emFossilKgPerM2_y = area > 0 ? (emFossilTons * 1000) / area : 0;
    const emHPKgPerM2_y = area > 0 ? (emHPTons * 1000) / area : 0;

    const landlordShareFossil = landlordShareFromSpecificEmissions(emFossilKgPerM2_y);
    const landlordShareHP = landlordShareFromSpecificEmissions(emHPKgPerM2_y);

    const co2Price = co2Prices[y] || 0;
    const co2CostFossil = emFossilTons * co2Price;
    const co2CostHP = emHPTons * co2Price;

    const landlordCostFossilYear =
      fuelCostFossil + input.maintFossil + co2CostFossil * landlordShareFossil;
    const landlordCostHPYear =
      fuelCostHP + input.maintHP + co2CostHP * landlordShareHP;

    cumFossilTmp += landlordCostFossilYear;
    cumHPTmp += landlordCostHPYear;

    cumFossil.push(cumFossilTmp);
    cumHP.push(cumHPTmp);

    const delta = landlordCostFossilYear - landlordCostHPYear;
    cumSavings += delta;

    rows.push({
      year: yearLabel,
      co2Price,
      landlordShareFossil,
      landlordShareHP,
      costFossil: landlordCostFossilYear,
      costHP: landlordCostHPYear,
      delta,
      cumSavings,
    });
  }

  let paybackYear: number | null = null;
  if (extraInvest > 0) {
    for (let i = 0; i < years; i++) {
      if (cumHP[i] <= cumFossil[i]) {
        paybackYear = i + 1;
        break;
      }
    }
  }

  const totalFossil = cumFossil[cumFossil.length - 1] ?? input.investFossil;
  const totalHP = cumHP[cumHP.length - 1] ?? (input.investHP - input.subsidyHP);
  const savings = totalFossil - totalHP;

  return {
    extraInvest,
    paybackYear,
    totalFossil,
    totalHP,
    savings,
    co2FossilKgPerM2,
    co2HPKgPerM2,
    landlordShareFossilStatic,
    landlordShareHPStatic,
    rows,
    cumFossil,
    cumHP,
  };
}
