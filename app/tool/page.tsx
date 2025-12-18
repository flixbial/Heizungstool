"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

type ScenarioName = "Sehr niedrig" | "Niedrig" | "Experten" | "Hoch" | "Sehr hoch";
type CarrierFossil = "Erdgas" | "Flüssiggas" | "Heizöl" | "Pellets";
type CarrierHP = "Strom Stromix" | "Strom Erneuerbar";
type Role = "eigentuemer" | "vermieter" | "mieter";

interface FormState {
  heatDemand: number;
  area: number;
  units: number;
  years: number;
  scenario: ScenarioName;
  carrierFossil: CarrierFossil;
  carrierHP: CarrierHP;

  investFossil: number;
  effFossil: number;
  priceFossil0: number; // ct/kWh
  incFossil: number; // %/a
  maintFossil: number; // €/a

  investHP: number;
  subsidyHP: number;
  jaz: number;
  priceEl0: number; // ct/kWh
  incEl: number; // %/a
  maintHP: number; // €/a
}

interface CalcResult {
  extraInvest: number;

  paybackLandlord: number | null;
  paybackOwner: number | null;

  totalLandlordFossil: number;
  totalLandlordHP: number;
  savingsLandlord: number;

  totalTenantFossil: number;
  totalTenantHP: number;
  savingsTenant: number;

  totalOwnerFossil: number;
  totalOwnerHP: number;
  savingsOwner: number;

  co2FossilKgPerM2: number;
  co2HPKgPerM2: number;
  landlordShareFossilStatic: number;
  landlordShareHPStatic: number;

  rows: {
    year: number;
    co2Price: number;

    landlordShareFossil: number;
    landlordShareHP: number;

    fuelCostFossil: number;
    fuelCostHP: number;
    co2CostFossil: number;
    co2CostHP: number;

    landlordAnnualFossil: number;
    landlordAnnualHP: number;
    tenantAnnualFossil: number;
    tenantAnnualHP: number;
    ownerAnnualFossil: number;
    ownerAnnualHP: number;

    landlordCumSavings: number;
    tenantCumSavings: number;
    ownerCumSavings: number;
  }[];

  cumLandlordFossil: number[];
  cumLandlordHP: number[];
  cumTenantFossil: number[];
  cumTenantHP: number[];
  cumOwnerFossil: number[];
  cumOwnerHP: number[];
}

interface FoerderForm {
  art: "wohn" | "nichtwohn";
  wohnKlimaBonus: boolean;
  wohnEinkommensBonus: boolean;
  wohnEffizienzBonus: boolean;
  nwgEffizienzBonus: boolean;
}

interface FoerderResult {
  art: "wohn" | "nichtwohn";
  invest: number;
  foerderProzent: number;
  foerderEuro: number;
  restInvest: number;
  begrenztAuf: number | null;
  kostenobergrenze: number | null;
  foerderhoechstbetragNWG: number | null;
}

function formatEuro(value: number, decimals = 0) {
  return (
    Number(value || 0).toLocaleString("de-DE", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + " €"
  );
}

function getPrintHint(role: Role) {
  if (role === "vermieter") {
    return {
      title: "Bericht für Vermieter",
      text:
        "Fokus auf Vermieterkosten (Investition, Wartung, Vermieteranteil CO₂) sowie Vorteil/Nachteil und Amortisation.",
    };
  }
  if (role === "mieter") {
    return {
      title: "Bericht für Mieter",
      text:
        "Fokus auf laufende Kosten (Energie + Mieteranteil CO₂). Investitionen werden in dieser Perspektive nicht bewertet.",
    };
  }
  return {
    title: "Bericht für Eigentümer (Selbstnutzer)",
    text:
      "Fokus auf Gesamtkosten inkl. Investition, Energie, Wartung und CO₂ sowie Vorteil/Nachteil und Amortisation.",
  };
}

export default function ToolPage() {
  const [tab, setTab] = useState<"vergleich" | "foerder">("vergleich");
  const [role, setRole] = useState<Role>("vermieter");

  const [form, setForm] = useState<FormState>({
    heatDemand: 30000,
    area: 500,
    units: 4,
    years: 20,
    scenario: "Experten",
    carrierFossil: "Heizöl",
    carrierHP: "Strom Stromix",

    investFossil: 30000,
    effFossil: 90,
    priceFossil0: 10, // ct/kWh
    incFossil: 3,
    maintFossil: 800,

    investHP: 60000,
    subsidyHP: 15000,
    jaz: 3.0,
    priceEl0: 30, // ct/kWh
    incEl: 2,
    maintHP: 600,
  });

  const [foerderForm, setFoerderForm] = useState<FoerderForm>({
    art: "wohn",
    wohnKlimaBonus: false,
    wohnEinkommensBonus: false,
    wohnEffizienzBonus: false,
    nwgEffizienzBonus: false,
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CalcResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [foerderLoading, setFoerderLoading] = useState(false);
  const [foerderResult, setFoerderResult] = useState<FoerderResult | null>(null);
  const [foerderError, setFoerderError] = useState<string | null>(null);

  const [subsidyApplied, setSubsidyApplied] = useState(false);

  function updateField<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({
      ...prev,
      [key]:
        typeof prev[key] === "number"
          ? Number(value.replace(",", "."))
          : (value as any),
    }));
  }

  async function handleCalc(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/calc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Fehler bei der Berechnung");
      const data = (await res.json()) as CalcResult;
      setResult(data);
    } catch (err: any) {
      setError(err.message ?? "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }

  function updateFoerderField<K extends keyof FoerderForm>(key: K, value: FoerderForm[K]) {
    setFoerderForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleFoerderCalc(e: React.FormEvent) {
    e.preventDefault();
    setFoerderLoading(true);
    setFoerderError(null);
    setFoerderResult(null);
    try {
      const body = {
        ...foerderForm,
        invest: form.investHP, // ✅ aus Heizungsvergleich
        area: form.area,
        units: form.units,
      };
      const res = await fetch("/api/foerder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Fehler bei der Förderberechnung");
      }
      const data = (await res.json()) as FoerderResult;
      setFoerderResult(data);
      setSubsidyApplied(false);
    } catch (err: any) {
      setFoerderError(err.message ?? "Unbekannter Fehler");
    } finally {
      setFoerderLoading(false);
    }
  }

  const perspective = useMemo(() => {
    if (!result) return null;

    if (role === "vermieter") {
      return {
        label: "Vermieter",
        totalFossil: result.totalLandlordFossil,
        totalHP: result.totalLandlordHP,
        savings: result.savingsLandlord,
        payback: result.extraInvest <= 0 ? null : result.paybackLandlord,
        cumFossil: result.cumLandlordFossil,
        cumHP: result.cumLandlordHP,
        annualKeyFossil: "landlordAnnualFossil" as const,
        annualKeyHP: "landlordAnnualHP" as const,
        cumSavingsKey: "landlordCumSavings" as const,
        note:
          "Vereinfachte Annahme: Vermieter zahlt Wartung + Vermieteranteil CO₂. Energie zahlt der Mieter.",
      };
    }
    if (role === "mieter") {
      return {
        label: "Mieter",
        totalFossil: result.totalTenantFossil,
        totalHP: result.totalTenantHP,
        savings: result.savingsTenant,
        payback: null,
        cumFossil: result.cumTenantFossil,
        cumHP: result.cumTenantHP,
        annualKeyFossil: "tenantAnnualFossil" as const,
        annualKeyHP: "tenantAnnualHP" as const,
        cumSavingsKey: "tenantCumSavings" as const,
        note:
          "Vereinfachte Annahme: Mieter zahlt Energie + Mieteranteil CO₂. Investitionen werden hier nicht betrachtet.",
      };
    }
    return {
      label: "Eigentümer (Selbstnutzer)",
      totalFossil: result.totalOwnerFossil,
      totalHP: result.totalOwnerHP,
      savings: result.savingsOwner,
      payback: result.extraInvest <= 0 ? null : result.paybackOwner,
      cumFossil: result.cumOwnerFossil,
      cumHP: result.cumOwnerHP,
      annualKeyFossil: "ownerAnnualFossil" as const,
      annualKeyHP: "ownerAnnualHP" as const,
      cumSavingsKey: "ownerCumSavings" as const,
      note:
        "Eigentümer (Selbstnutzer) trägt Investition, Energie, Wartung und 100% der CO₂-Kosten.",
    };
  }, [result, role]);

  const chartData = useMemo(() => {
    if (!result || !perspective) return [];
    return result.rows.map((row, idx) => ({
      name: `J${idx + 1}`,
      kumFossil: perspective.cumFossil[idx],
      kumHP: perspective.cumHP[idx],
    }));
  }, [result, perspective]);

  const totalChartData = useMemo(() => {
    if (!perspective) return [];
    return [
      { name: "Fossil", kosten: perspective.totalFossil },
      { name: "Wärmepumpe", kosten: perspective.totalHP },
    ];
  }, [perspective]);

  const hint = getPrintHint(role);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 text-sm">
      <h1 className="text-2xl font-semibold mb-1">Heizungs-Vergleich &amp; Förderrechner</h1>
      <p className="text-slate-600 mb-4">
        Vergleich fossil vs. Wärmepumpe. Ergebnisse können je nach Rolle (Eigentümer/Vermieter/Mieter) unterschiedlich ausfallen.
      </p>

      {/* Rolle */}
      <div className="bg-white border rounded-xl p-4 shadow-sm mb-6">
        <label className="block text-xs font-medium text-slate-700 mb-1">Deine Rolle / Zielgruppe</label>
        <select
          className="w-full md:w-[360px] border rounded-lg px-2 py-1.5"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
        >
          <option value="eigentuemer">Eigentümer (Selbstnutzer)</option>
          <option value="vermieter">Vermieter</option>
          <option value="mieter">Mieter</option>
        </select>
        <p className="text-[11px] text-slate-500 mt-2">
          Hinweis: Vereinfachtes Modell (CO₂-Kosten werden anteilig verteilt; Energie typischerweise vom Mieter getragen).
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6 text-sm">
        <button
          className={
            "px-4 py-2 border-b-2 -mb-px " +
            (tab === "vergleich"
              ? "border-blue-600 text-blue-600 font-medium"
              : "border-transparent text-slate-500 hover:text-slate-800")
          }
          onClick={() => setTab("vergleich")}
        >
          Heizungs-Vergleich
        </button>
        <button
          className={
            "px-4 py-2 border-b-2 -mb-px " +
            (tab === "foerder"
              ? "border-blue-600 text-blue-600 font-medium"
              : "border-transparent text-slate-500 hover:text-slate-800")
          }
          onClick={() => setTab("foerder")}
        >
          Förderrechner
        </button>
      </div>

      {tab === "vergleich" && (
        <>
          <form onSubmit={handleCalc} className="grid gap-6 md:grid-cols-2 mb-8">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">Heizwärmebedarf / Energieverbrauch (kWh/a)</label>
                <input
                  type="number"
                  className="mt-1 w-full border rounded-lg px-2 py-1.5"
                  value={form.heatDemand}
                  onChange={(e) => updateField("heatDemand", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Gebäudefläche (m²)</label>
                <input
                  type="number"
                  className="mt-1 w-full border rounded-lg px-2 py-1.5"
                  value={form.area}
                  onChange={(e) => updateField("area", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Wohneinheiten</label>
                <input
                  type="number"
                  className="mt-1 w-full border rounded-lg px-2 py-1.5"
                  value={form.units}
                  onChange={(e) => updateField("units", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Betrachtungszeitraum (Jahre)</label>
                <input
                  type="number"
                  className="mt-1 w-full border rounded-lg px-2 py-1.5"
                  value={form.years}
                  onChange={(e) => updateField("years", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">CO₂-Preisszenario</label>
                <select
                  className="mt-1 w-full border rounded-lg px-2 py-1.5"
                  value={form.scenario}
                  onChange={(e) => updateField("scenario", e.target.value as ScenarioName)}
                >
                  <option>Sehr niedrig</option>
                  <option>Niedrig</option>
                  <option>Experten</option>
                  <option>Hoch</option>
                  <option>Sehr hoch</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Energiequelle fossile Heizung</label>
                <select
                  className="mt-1 w-full border rounded-lg px-2 py-1.5"
                  value={form.carrierFossil}
                  onChange={(e) => updateField("carrierFossil", e.target.value as CarrierFossil)}
                >
                  <option value="Erdgas">Erdgas</option>
                  <option value="Flüssiggas">Flüssiggas</option>
                  <option value="Heizöl">Heizöl</option>
                  <option value="Pellets">Pellets</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">Investitionskosten fossile Heizung (€, einmalig)</label>
                <input
                  type="number"
                  className="mt-1 w-full border rounded-lg px-2 py-1.5"
                  value={form.investFossil}
                  onChange={(e) => updateField("investFossil", e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Wirkungsgrad fossile Heizung (%)</label>
                <input
                  type="number"
                  className="mt-1 w-full border rounded-lg px-2 py-1.5"
                  value={form.effFossil}
                  onChange={(e) => updateField("effFossil", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Brennstoffpreis heute (ct/kWh)</label>
                  <input
                    type="number"
                    className="mt-1 w-full border rounded-lg px-2 py-1.5"
                    value={form.priceFossil0}
                    onChange={(e) => updateField("priceFossil0", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Preissteigerung Brennstoff (%/a)</label>
                  <input
                    type="number"
                    className="mt-1 w-full border rounded-lg px-2 py-1.5"
                    value={form.incFossil}
                    onChange={(e) => updateField("incFossil", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">Wartungs-/Fixkosten fossile Heizung (€/a)</label>
                <input
                  type="number"
                  className="mt-1 w-full border rounded-lg px-2 py-1.5"
                  value={form.maintFossil}
                  onChange={(e) => updateField("maintFossil", e.target.value)}
                />
              </div>

              <div className="border-t pt-3 mt-2">
                <h2 className="font-semibold text-xs mb-2">Wärmepumpe</h2>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Stromquelle / Strommix</label>
                    <select
                      className="mt-1 w-full border rounded-lg px-2 py-1.5"
                      value={form.carrierHP}
                      onChange={(e) => updateField("carrierHP", e.target.value as CarrierHP)}
                    >
                      <option value="Strom Stromix">Strom Stromix</option>
                      <option value="Strom Erneuerbar">Strom Erneuerbar</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">JAZ (Jahresarbeitszahl)</label>
                    <input
                      type="number"
                      className="mt-1 w-full border rounded-lg px-2 py-1.5"
                      value={form.jaz}
                      onChange={(e) => updateField("jaz", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Investitionskosten WP (brutto, €)</label>
                    <input
                      type="number"
                      className="mt-1 w-full border rounded-lg px-2 py-1.5"
                      value={form.investHP}
                      onChange={(e) => updateField("investHP", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Förderung WP (Zuschuss, €)</label>
                    <input
                      type="number"
                      className="mt-1 w-full border rounded-lg px-2 py-1.5"
                      value={form.subsidyHP}
                      onChange={(e) => updateField("subsidyHP", e.target.value)}
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Tipp: Im Förderrechner „Zuschuss übernehmen“ klicken.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Strompreis heute (ct/kWh)</label>
                    <input
                      type="number"
                      className="mt-1 w-full border rounded-lg px-2 py-1.5"
                      value={form.priceEl0}
                      onChange={(e) => updateField("priceEl0", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Preissteigerung Strom (%/a)</label>
                    <input
                      type="number"
                      className="mt-1 w-full border rounded-lg px-2 py-1.5"
                      value={form.incEl}
                      onChange={(e) => updateField("incEl", e.target.value)}
                    />
                  </div>
                </div>

                <div className="mt-2">
                  <label className="block text-xs font-medium text-slate-700">Wartungs-/Fixkosten WP (€/a)</label>
                  <input
                    type="number"
                    className="mt-1 w-full border rounded-lg px-2 py-1.5"
                    value={form.maintHP}
                    onChange={(e) => updateField("maintHP", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-2 flex justify-end mt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-60"
              >
                {loading ? "Berechne ..." : "Berechnen"}
              </button>
            </div>
          </form>

          {error && <p className="text-xs text-red-600 mb-4">{error}</p>}

          {
