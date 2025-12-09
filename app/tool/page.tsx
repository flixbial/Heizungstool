// app/tool/page.tsx
"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

type ScenarioName = "Sehr niedrig" | "Niedrig" | "Experten" | "Hoch" | "Sehr hoch";
type CarrierFossil = "Erdgas" | "Flüssiggas" | "Heizöl" | "Pellets";
type CarrierHP = "Strom Stromix" | "Strom Erneuerbar";

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
  priceFossil0: number;
  incFossil: number;
  maintFossil: number;
  investHP: number;
  subsidyHP: number;
  jaz: number;
  priceEl0: number;
  incEl: number;
  maintHP: number;
}

interface CalcResult {
  extraInvest: number;
  paybackYear: number | null;
  totalFossil: number;
  totalHP: number;
  savings: number;
  co2FossilKgPerM2: number;
  co2HPKgPerM2: number;
  landlordShareFossilStatic: number;
  landlordShareHPStatic: number;
  rows: {
    year: number;
    co2Price: number;
    landlordShareFossil: number;
    landlordShareHP: number;
    costFossil: number;
    costHP: number;
    delta: number;
    cumSavings: number;
  }[];
  cumFossil: number[];
  cumHP: number[];
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
    value.toLocaleString("de-DE", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + " €"
  );
}

export default function ToolPage() {
  const [tab, setTab] = useState<"vergleich" | "foerder">("vergleich");

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
  const [foerderResult, setFoerderResult] = useState<FoerderResult | null>(
    null
  );
  const [foerderError, setFoerderError] = useState<string | null>(null);

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

  function updateFoerderField<K extends keyof FoerderForm>(
    key: K,
    value: FoerderForm[K]
  ) {
    setFoerderForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleFoerderCalc(e: React.FormEvent) {
    e.preventDefault();
    setFoerderLoading(true);
    setFoerderError(null);
    setFoerderResult(null);
    try {
      const body = {
        ...foerderForm,
        // Investitionskosten kommen jetzt aus dem Heizungsvergleich:
        invest: form.investHP,
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
    } catch (err: any) {
      setFoerderError(err.message ?? "Unbekannter Fehler");
    } finally {
      setFoerderLoading(false);
    }
  }

  const chartData =
    result?.rows.map((row, idx) => ({
      name: `J${idx + 1}`,
      kumFossil: result.cumFossil[idx],
      kumHP: result.cumHP[idx],
    })) ?? [];

  const totalChartData = result
    ? [
        { name: "Fossil", kosten: result.totalFossil },
        { name: "Wärmepumpe", kosten: result.totalHP },
      ]
    : [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 text-sm">
      <h1 className="text-2xl font-semibold mb-1">
        Heizungs-Vergleich &amp; Förderrechner
      </h1>
      <p className="text-slate-600 mb-6">
        Vergleich fossil vs. Wärmepumpe aus Vermietersicht. Rechenlogik und
        Fördermodelle laufen vollständig serverseitig.
      </p>

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
          <form
            onSubmit={handleCalc}
            className="grid gap-6 md:grid-cols-2 mb-8"
          >
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Heizwärmebedarf / Energieverbrauch (kWh/a)
                </label>
                <input
                  type="number"
                  className="mt-1 w-full border rounded-lg px-2 py-1.5"
                  value={form.heatDemand}
                  onChange={(e) => updateField("heatDemand", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Gebäudefläche (m²)
                </label>
                <input
                  type="number"
                  className="mt-1 w-full border rounded-lg px-2 py-1.5"
                  value={form.area}
                  onChange={(e) => updateField("area", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Wohneinheiten
                </label>
                <input
                  type="number"
                  className="mt-1 w-full border rounded-lg px-2 py-1.5"
                  value={form.units}
                  onChange={(e) => updateField("units", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Betrachtungszeitraum (Jahre)
                </label>
                <input
                  type="number"
                  className="mt-1 w-full border rounded-lg px-2 py-1.5"
                  value={form.years}
                  onChange={(e) => updateField("years", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  CO₂-Preisszenario
                </label>
                <select
                  className="mt-1 w-full border rounded-lg px-2 py-1.5"
                  value={form.scenario}
                  onChange={(e) =>
                    updateField("scenario", e.target.value as ScenarioName)
                  }
                >
                  <option>Sehr niedrig</option>
                  <option>Niedrig</option>
                  <option>Experten</option>
                  <option>Hoch</option>
                  <option>Sehr hoch</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Energiequelle fossile Heizung
                </label>
                <select
                  className="mt-1 w-full border rounded-lg px-2 py-1.5"
                  value={form.carrierFossil}
                  onChange={(e) =>
                    updateField(
                      "carrierFossil",
                      e.target.value as CarrierFossil
                    )
                  }
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
                <label className="block text-xs font-medium text-slate-700">
                  Investitionskosten fossile Heizung (€, einmalig)
                </label>
                <input
                  type="number"
                  className="mt-1 w-full border rounded-lg px-2 py-1.5"
                  value={form.investFossil}
                  onChange={(e) => updateField("investFossil", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Wirkungsgrad fossile Heizung (%)
                </label>
                <input
                  type="number"
                  className="mt-1 w-full border rounded-lg px-2 py-1.5"
                  value={form.effFossil}
                  onChange={(e) => updateField("effFossil", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Brennstoffpreis heute (ct/kWh)
                  </label>
                  <input
                    type="number"
                    className="mt-1 w-full border rounded-lg px-2 py-1.5"
                    value={form.priceFossil0}
                    onChange={(e) =>
                      updateField("priceFossil0", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Preissteigerung Brennstoff (%/a)
                  </label>
                  <input
                    type="number"
                    className="mt-1 w-full border rounded-lg px-2 py-1.5"
                    value={form.incFossil}
                    onChange={(e) => updateField("incFossil", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Wartungs-/Fixkosten fossile Heizung (€/a)
                </label>
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
                    <label className="block text-xs font-medium text-slate-700">
                      Stromquelle / Strommix
                    </label>
                    <select
                      className="mt-1 w-full border rounded-lg px-2 py-1.5"
                      value={form.carrierHP}
                      onChange={(e) =>
                        updateField("carrierHP", e.target.value as CarrierHP)
                      }
                    >
                      <option value="Strom Stromix">Strom Stromix</option>
                      <option value="Strom Erneuerbar">Strom Erneuerbar</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      JAZ (Jahresarbeitszahl)
                    </label>
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
                    <label className="block text-xs font-medium text-slate-700">
                      Investitionskosten WP (brutto, €)
                    </label>
                    <input
                      type="number"
                      className="mt-1 w-full border rounded-lg px-2 py-1.5"
                      value={form.investHP}
                      onChange={(e) => updateField("investHP", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Förderung WP (Zuschuss, €)
                    </label>
                    <input
                      type="number"
                      className="mt-1 w-full border rounded-lg px-2 py-1.5"
                      value={form.subsidyHP}
                      onChange={(e) =>
                        updateField("subsidyHP", e.target.value)
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Strompreis heute (ct/kWh)
                    </label>
                    <input
                      type="number"
                      className="mt-1 w-full border rounded-lg px-2 py-1.5"
                      value={form.priceEl0}
                      onChange={(e) =>
                        updateField("priceEl0", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">
                      Preissteigerung Strom (%/a)
                    </label>
                    <input
                      type="number"
                      className="mt-1 w-full border rounded-lg px-2 py-1.5"
                      value={form.incEl}
                      onChange={(e) => updateField("incEl", e.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <label className="block text-xs font-medium text-slate-700">
                    Wartungs-/Fixkosten WP (€/a)
                  </label>
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

          {result && (
            <section className="space-y-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white border rounded-xl p-4 shadow-sm">
                  <div className="text-xs text-slate-500">
                    Mehrinvestition Wärmepumpe (netto vs. fossil)
                  </div>
                  <div className="text-lg font-semibold">
                    {formatEuro(result.extraInvest, 0)}
                  </div>
                </div>
                <div className="bg-white border rounded-xl p-4 shadow-sm">
                  <div className="text-xs text-slate-500">
                    Einfache Amortisationszeit
                  </div>
                  <div className="text-lg font-semibold">
                    {result.extraInvest <= 0
                      ? "Keine Mehrinvestition"
                      : result.paybackYear
                      ? `${result.paybackYear}. Jahr`
                      : "Keine vollständige Amortisation"}
                  </div>
                </div>
                <div className="bg-white border rounded-xl p-4 shadow-sm">
                  <div className="text-xs text-slate-500">
                    Vorteil/Nachteil Wärmepumpe
                  </div>
                  <div
                    className={
                      "text-lg font-semibold " +
                      (result.savings > 0
                        ? "text-emerald-700"
                        : result.savings < 0
                        ? "text-red-700"
                        : "")
                    }
                  >
                    {(result.savings >= 0 ? "Vorteil: " : "Nachteil: ") +
                      formatEuro(Math.abs(result.savings), 0)}
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white border rounded-xl p-4 shadow-sm">
                  <div className="text-xs text-slate-500 mb-1">
                    Fossile Heizung – CO₂ &amp; Vermieteranteil
                  </div>
                  <div className="text-base font-semibold">
                    {result.co2FossilKgPerM2.toLocaleString("de-DE", {
                      maximumFractionDigits: 1,
                    })}{" "}
                    kg CO₂/m²a
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Vermieteranteil:{" "}
                    {(result.landlordShareFossilStatic * 100).toLocaleString(
                      "de-DE",
                      { maximumFractionDigits: 0 }
                    )}
                    %
                  </div>
                </div>
                <div className="bg-white border rounded-xl p-4 shadow-sm">
                  <div className="text-xs text-slate-500 mb-1">
                    Wärmepumpe – CO₂ &amp; Vermieteranteil
                  </div>
                  <div className="text-base font-semibold">
                    {result.co2HPKgPerM2.toLocaleString("de-DE", {
                      maximumFractionDigits: 1,
                    })}{" "}
                    kg CO₂/m²a
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Vermieteranteil:{" "}
                    {(result.landlordShareHPStatic * 100).toLocaleString(
                      "de-DE",
                      { maximumFractionDigits: 0 }
                    )}
                    %
                  </div>
                </div>
              </div>

              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <div className="text-xs text-slate-500 mb-2">
                  Kumulierte Vermieterkosten – fossil vs. Wärmepumpe
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: any) => formatEuro(Number(value), 0)}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="kumFossil"
                        name="kumuliert fossil"
                        stroke="#ef4444"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="kumHP"
                        name="kumuliert Wärmepumpe"
                        stroke="#2563eb"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <div className="text-xs text-slate-500 mb-2">
                  Gesamtkosten im Betrachtungszeitraum
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={totalChartData}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: any) => formatEuro(Number(value), 0)}
                      />
                      <Bar dataKey="kosten" name="Gesamtkosten" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border rounded-xl p-4 shadow-sm overflow-x-auto">
                <div className="text-xs text-slate-500 mb-2">
                  Jährliche Übersicht (Vermietersicht)
                </div>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1 pr-2">Jahr</th>
                      <th className="text-right py-1 px-2">CO₂-Preis</th>
                      <th className="text-right py-1 px-2">
                        Vermieteranteil fossil
                      </th>
                      <th className="text-right py-1 px-2">
                        Vermieteranteil WP
                      </th>
                      <th className="text-right py-1 px-2">Kosten fossil</th>
                      <th className="text-right py-1 px-2">Kosten WP</th>
                      <th className="text-right py-1 px-2">Delta</th>
                      <th className="text-right py-1 px-2">
                        kumulierte Einsparung
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row) => (
                      <tr key={row.year} className="border-b">
                        <td className="py-1 pr-2">{row.year}</td>
                        <td className="py-1 px-2 text-right">
                          {row.co2Price.toLocaleString("de-DE", {
                            maximumFractionDigits: 0,
                          })}{" "}
                          €
                        </td>
                        <td className="py-1 px-2 text-right">
                          {(row.landlordShareFossil * 100).toLocaleString(
                            "de-DE",
                            { maximumFractionDigits: 0 }
                          )}
                          %
                        </td>
                        <td className="py-1 px-2 text-right">
                          {(row.landlordShareHP * 100).toLocaleString(
                            "de-DE",
                            { maximumFractionDigits: 0 }
                          )}
                          %
                        </td>
                        <td className="py-1 px-2 text-right">
                          {formatEuro(row.costFossil, 0)}
                        </td>
                        <td className="py-1 px-2 text-right">
                          {formatEuro(row.costHP, 0)}
                        </td>
                        <td className="py-1 px-2 text-right">
                          {formatEuro(row.delta, 0)}
                        </td>
                        <td className="py-1 px-2 text-right">
                          {formatEuro(row.cumSavings, 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {tab === "foerder" && (
        <section className="grid md:grid-cols-2 gap-6">
          <form onSubmit={handleFoerderCalc} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Gebäudeart
              </label>
              <select
                className="w-full border rounded-lg px-2 py-1.5"
                value={foerderForm.art}
                onChange={(e) =>
                  updateFoerderField("art", e.target.value as "wohn" | "nichtwohn")
                }
              >
                <option value="wohn">
                  Wohngebäude (Privatpersonen / WEG)
                </option>
                <option value="nichtwohn">
                  Nichtwohngebäude (Unternehmen, Vereine, Kommunen)
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Investitionskosten Wärmepumpe (brutto, €)
              </label>
              <input
                type="number"
                className="w-full border rounded-lg px-2 py-1.5 bg-slate-50"
                value={form.investHP}
                readOnly
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Investitionskosten, Gebäudefläche und Wohneinheiten werden aus
                dem Heizungsrechner übernommen.
              </p>
            </div>

            {foerderForm.art === "wohn" ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-700">
                  Wohngebäude-Optionen (vereinfacht)
                </p>
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={foerderForm.wohnKlimaBonus}
                    onChange={(e) =>
                      updateFoerderField("wohnKlimaBonus", e.target.checked)
                    }
                  />
                  Klima-Geschwindigkeitsbonus
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={foerderForm.wohnEinkommensBonus}
                    onChange={(e) =>
                      updateFoerderField(
                        "wohnEinkommensBonus",
                        e.target.checked
                      )
                    }
                  />
                  Einkommensbonus (≤ 40.000 € / Jahr, selbstgenutzt)
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={foerderForm.wohnEffizienzBonus}
                    onChange={(e) =>
                      updateFoerderField("wohnEffizienzBonus", e.target.checked)
                    }
                  />
                  Effizienzbonus (z. B. Erdreich-/Wasser-WP)
                </label>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-700">
                  Nichtwohngebäude-Optionen (KfW 522, vereinfacht)
                </p>
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={foerderForm.nwgEffizienzBonus}
                    onChange={(e) =>
                      updateFoerderField("nwgEffizienzBonus", e.target.checked)
                    }
                  />
                  Effiziente elektrisch angetriebene Wärmepumpe
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={foerderLoading}
              className="mt-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-60"
            >
              {foerderLoading
                ? "Berechne Förderung ..."
                : "Förderung berechnen"}
            </button>

            {foerderError && (
              <p className="text-xs text-red-600 mt-2">{foerderError}</p>
            )}
          </form>

          <div className="bg-white border rounded-xl p-4 shadow-sm text-sm">
            {!foerderResult && (
              <p className="text-slate-600">
                Geben Sie links die passenden Optionen für das Gebäude an.
                Nach der Berechnung sehen Sie hier eine Abschätzung von
                Förderquote, Zuschuss und verbleibender Investition. Die
                Investitionssumme stammt aus dem Heizungsvergleich
                (Wärmepumpe).
              </p>
            )}

            {foerderResult && (
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-slate-500">Förderquote</div>
                  <div className="text-lg font-semibold">
                    {foerderResult.foerderProzent.toLocaleString("de-DE", {
                      maximumFractionDigits: 1,
                    })}{" "}
                    %
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">
                    Geschätzter Zuschuss
                  </div>
                  <div className="text-lg font-semibold">
                    {formatEuro(foerderResult.foerderEuro, 0)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">
                    Verbleibende Investition nach Zuschuss
                  </div>
                  <div className="text-lg font-semibold">
                    {formatEuro(foerderResult.restInvest, 0)}
                  </div>
                </div>

                {foerderResult.art === "wohn" && (
                  <div className="text-xs text-slate-600">
                    Heizungs-Kostenobergrenze (Wohngebäude, vereinfacht):{" "}
                    {foerderResult.kostenobergrenze !== null &&
                      formatEuro(foerderResult.kostenobergrenze, 0)}
                    {foerderResult.begrenztAuf !== null && (
                      <p className="mt-1">
                        Die eingegebene Investition liegt über der Obergrenze –
                        für die Berechnung wird nur die Obergrenze
                        berücksichtigt.
                      </p>
                    )}
                  </div>
                )}

                {foerderResult.art === "nichtwohn" && (
                  <div className="text-xs text-slate-600">
                    Förderhöchstbetrag nach KfW 522 (vereinfacht):{" "}
                    {foerderResult.foerderhoechstbetragNWG !== null &&
                      formatEuro(foerderResult.foerderhoechstbetragNWG, 0)}
                    {foerderResult.begrenztAuf !== null && (
                      <p className="mt-1">
                        Die eingegebene Investition liegt über dem
                        Förderhöchstbetrag – für die Berechnung wird nur dieser
                        berücksichtigt.
                      </p>
                    )}
                  </div>
                )}

                <p className="text-[11px] text-slate-500">
                  Alle Angaben ohne Gewähr. Maßgeblich sind die aktuellen
                  Richtlinien und Zusagen der Förderstellen (z. B. KfW/BAFA).
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
