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
  priceFossil0: number; // ct/kWh (UI)
  incFossil: number; // %/a
  maintFossil: number; // €/a

  investHP: number; // €
  subsidyHP: number; // €
  jaz: number;
  priceEl0: number; // ct/kWh (UI)
  incEl: number; // %/a
  maintHP: number; // €/a
}

export interface YearRow {
  year: number;
  co2Price: number;

  // emissions + shares
  landlordShareFossil: number;
  landlordShareHP: number;

  // cost building blocks (full system)
  fuelCostFossil: number;
  fuelCostHP: number;
  co2CostFossil: number;
  co2CostHP: number;

  // per-role annual costs
  landlordAnnualFossil: number;
  landlordAnnualHP: number;
  tenantAnnualFossil: number;
  tenantAnnualHP: number;
  ownerAnnualFossil: number;
  ownerAnnualHP: number;

  // per-role cumulative savings vs HP (Fossil - HP)
  landlordCumSavings: number;
  tenantCumSavings: number;
  ownerCumSavings: number;
}

export interface CalcResult {
  extraInvest: number;

  // Payback per role (if extraInvest>0)
  paybackLandlord: number | null;
  paybackOwner: number | null;

  // Totals per role (cum end)
  totalLandlordFossil: number;
  totalLandlordHP: number;
  savingsLandlord: number;

  totalTenantFossil: number;
  totalTenantHP: number;
  savingsTenant: number;

  totalOwnerFossil: number;
  totalOwnerHP: number;
  savingsOwner: number;

  // Info
  co2FossilKgPerM2: number;
  co2HPKgPerM2: number;
  landlordShareFossilStatic: number;
  landlordShareHPStatic: number;

  rows: YearRow[];

  // Cumulative series per role (for charts)
  cumLandlordFossil: number[];
  cumLandlordHP: number[];
  cumTenantFossil: number[];
  cumTenantHP: number[];
  cumOwnerFossil: number[];
  cumOwnerHP: number[];
}

const EMISSION_FACTORS: Record<string, number> = {
  Erdgas: 0.201,
  Flüssiggas: 0.239,
  Heizöl: 0.266,
  "Strom Stromix": 0.107,
  "Strom Erneuerbar": 0.0,
  Pellets: 0.036,
};

const SCENARIO_PRICES: Record<
  ScenarioName,
  { year: number; price: number }[]
> = {
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
    { year: 2044, price: 93.0 },
  ],
  Niedrig: [
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
    { year: 2044, price: 150.0 },
  ],
  Experten: [
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
    { year: 2044, price: 292.5 },
  ],
  Hoch: [
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
    { year: 2044, price: 387.5 },
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
    { year: 2044, price: 482.5 },
  ],
};

function getScenarioPriceArray(scenario: ScenarioName, years: number): number[] {
  const data = SCENARIO_PRICES[scenario] || [];
  const baseYear = new Date().getFullYear();
  if (data.length === 0) return Array.from({ length: years }, () => 0);

  const prices: number[] = [];
  for (let i = 0; i < years; i++) {
    const year = baseYear + i;
    let entry = data.find((e) => e.year === year);
    if (!entry) entry = data[data.length - 1];
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

  // ✅ Preise kommen aus UI in ct/kWh -> hier in €/kWh umrechnen
  const priceFossil0_EUR = (input.priceFossil0 || 0) / 100;
  const priceEl0_EUR = (input.priceEl0 || 0) / 100;

  const co2Prices = getScenarioPriceArray(input.scenario, years);
  const currentYear = new Date().getFullYear();

  const effFossil = (input.effFossil || 0) / 100;
  const incFossil = (input.incFossil || 0) / 100;
  const incEl = (input.incEl || 0) / 100;

  const co2FactorFossil = EMISSION_FACTORS[input.carrierFossil] ?? 0;
  const co2FactorStrom = EMISSION_FACTORS[input.carrierHP] ?? 0;

  const endEnergyFossil = effFossil > 0 ? input.heatDemand / effFossil : 0;
  const elEnergyHP = input.jaz > 0 ? input.heatDemand / input.jaz : 0;

  const emFossilTonsYear = (endEnergyFossil * co2FactorFossil) / 1000;
  const emHPTonsYear = (elEnergyHP * co2FactorStrom) / 1000;

  const co2FossilKgPerM2 = area > 0 ? (emFossilTonsYear * 1000) / area : 0;
  const co2HPKgPerM2 = area > 0 ? (emHPTonsYear * 1000) / area : 0;

  const landlordShareFossilStatic =
    landlordShareFromSpecificEmissions(co2FossilKgPerM2);
  const landlordShareHPStatic =
    landlordShareFromSpecificEmissions(co2HPKgPerM2);

  const investHPNet = input.investHP - input.subsidyHP;
  const extraInvest = investHPNet - input.investFossil;

  // Cumulative arrays
  const cumLandlordFossil: number[] = [];
  const cumLandlordHP: number[] = [];
  const cumTenantFossil: number[] = [];
  const cumTenantHP: number[] = [];
  const cumOwnerFossil: number[] = [];
  const cumOwnerHP: number[] = [];

  let cumLandlordF = input.investFossil;
  let cumLandlordH = investHPNet;

  let cumTenantF = 0;
  let cumTenantH = 0;

  let cumOwnerF = input.investFossil;
  let cumOwnerH = investHPNet;

  let landlordCumSavings = 0;
  let tenantCumSavings = 0;
  let ownerCumSavings = 0;

  const rows: YearRow[] = [];

  for (let y = 0; y < years; y++) {
    const yearLabel = currentYear + y;

    const priceFossilYear = priceFossil0_EUR * Math.pow(1 + incFossil, y);
    const priceElYear = priceEl0_EUR * Math.pow(1 + incEl, y);

    const fuelCostFossil = endEnergyFossil * priceFossilYear;
    const fuelCostHP = elEnergyHP * priceElYear;

    const emFossilTons = (endEnergyFossil * co2FactorFossil) / 1000;
    const emHPTons = (elEnergyHP * co2FactorStrom) / 1000;

    const emFossilKgPerM2_y = area > 0 ? (emFossilTons * 1000) / area : 0;
    const emHPKgPerM2_y = area > 0 ? (emHPTons * 1000) / area : 0;

    const landlordShareFossil =
      landlordShareFromSpecificEmissions(emFossilKgPerM2_y);
    const landlordShareHP =
      landlordShareFromSpecificEmissions(emHPKgPerM2_y);

    const co2Price = co2Prices[y] || 0;
    const co2CostFossil = emFossilTons * co2Price;
    const co2CostHP = emHPTons * co2Price;

    // ✅ Split (vereinfachte Annahme):
    // Vermieter: Wartung + Vermieteranteil CO2
    // Mieter: Energie + Mieteranteil CO2
    // Eigentümer: alles
    const landlordAnnualFossil =
      input.maintFossil + co2CostFossil * landlordShareFossil;
    const landlordAnnualHP = input.maintHP + co2CostHP * landlordShareHP;

    const tenantAnnualFossil =
      fuelCostFossil + co2CostFossil * (1 - landlordShareFossil);
    const tenantAnnualHP = fuelCostHP + co2CostHP * (1 - landlordShareHP);

    const ownerAnnualFossil =
      fuelCostFossil + input.maintFossil + co2CostFossil;
    const ownerAnnualHP = fuelCostHP + input.maintHP + co2CostHP;

    // cumulate totals
    cumLandlordF += landlordAnnualFossil;
    cumLandlordH += landlordAnnualHP;
    cumTenantF += tenantAnnualFossil;
    cumTenantH += tenantAnnualHP;
    cumOwnerF += ownerAnnualFossil;
    cumOwnerH += ownerAnnualHP;

    cumLandlordFossil.push(cumLandlordF);
    cumLandlordHP.push(cumLandlordH);
    cumTenantFossil.push(cumTenantF);
    cumTenantHP.push(cumTenantH);
    cumOwnerFossil.push(cumOwnerF);
    cumOwnerHP.push(cumOwnerH);

    landlordCumSavings += landlordAnnualFossil - landlordAnnualHP;
    tenantCumSavings += tenantAnnualFossil - tenantAnnualHP;
    ownerCumSavings += ownerAnnualFossil - ownerAnnualHP;

    rows.push({
      year: yearLabel,
      co2Price,

      landlordShareFossil,
      landlordShareHP,

      fuelCostFossil,
      fuelCostHP,
      co2CostFossil,
      co2CostHP,

      landlordAnnualFossil,
      landlordAnnualHP,
      tenantAnnualFossil,
      tenantAnnualHP,
      ownerAnnualFossil,
      ownerAnnualHP,

      landlordCumSavings,
      tenantCumSavings,
      ownerCumSavings,
    });
  }

  let paybackLandlord: number | null = null;
  let paybackOwner: number | null = null;

  if (extraInvest > 0) {
    for (let i = 0; i < years; i++) {
      if (cumLandlordHP[i] <= cumLandlordFossil[i]) {
        paybackLandlord = i + 1;
        break;
      }
    }
    for (let i = 0; i < years; i++) {
      if (cumOwnerHP[i] <= cumOwnerFossil[i]) {
        paybackOwner = i + 1;
        break;
      }
    }
  }

  const totalLandlordFossil = cumLandlordFossil[cumLandlordFossil.length - 1];
  const totalLandlordHP = cumLandlordHP[cumLandlordHP.length - 1];
  const savingsLandlord = totalLandlordFossil - totalLandlordHP;

  const totalTenantFossil = cumTenantFossil[cumTenantFossil.length - 1];
  const totalTenantHP = cumTenantHP[cumTenantHP.length - 1];
  const savingsTenant = totalTenantFossil - totalTenantHP;

  const totalOwnerFossil = cumOwnerFossil[cumOwnerFossil.length - 1];
  const totalOwnerHP = cumOwnerHP[cumOwnerHP.length - 1];
  const savingsOwner = totalOwnerFossil - totalOwnerHP;

  return {
    extraInvest,

    paybackLandlord,
    paybackOwner,

    totalLandlordFossil,
    totalLandlordHP,
    savingsLandlord,

    totalTenantFossil,
    totalTenantHP,
    savingsTenant,

    totalOwnerFossil,
    totalOwnerHP,
    savingsOwner,

    co2FossilKgPerM2,
    co2HPKgPerM2,
    landlordShareFossilStatic,
    landlordShareHPStatic,

    rows,

    cumLandlordFossil,
    cumLandlordHP,
    cumTenantFossil,
    cumTenantHP,
    cumOwnerFossil,
    cumOwnerHP,
  };
}
