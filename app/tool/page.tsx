"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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

import { getNarrative } from "@/lib/narratives";
import type { NarrativeInput } from "@/lib/narratives/types";

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

function formatCt(value: number, decimals = 1) {
  return (
    Number(value || 0).toLocaleString("de-DE", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + " ct/kWh"
  );
}

function getPrintHint(role: Role) {
  if (role === "vermieter") {
    return {
      title: "Auswertung für Vermieter",
      text:
        "In dieser Perspektive betrachten wir Investition, Wartung und den Vermieteranteil der CO₂-Kosten. Energie zahlt typischerweise der Mieter.",
    };
  }
  if (role === "mieter") {
    return {
      title: "Auswertung für Mieter",
      text:
        "In dieser Perspektive betrachten wir laufende Kosten (Energie + CO₂-Anteil). Investitionen werden hier nicht bewertet.",
    };
  }
  return {
    title: "Auswertung für Eigentümer (Selbstnutzer)",
    text:
      "In dieser Perspektive betrachten wir Gesamtkosten inkl. Investition, Energie, Wartung und CO₂ – und leiten daraus eine Entscheidung ab.",
  };
}

/** Premium UI helper */
function Section({
  title,
  subtitle,
  children,
  tone = "neutral",
}: {
  title: string;
  subtitle?: string;
  tone?: "neutral" | "fossil" | "hp" | "result";
  children: React.ReactNode;
}) {
  const toneClasses =
    tone === "hp"
      ? "border-blue-200/70 bg-blue-50/30"
      : tone === "fossil"
      ? "border-rose-200/70 bg-rose-50/30"
      : tone === "result"
      ? "border-slate-200 bg-white"
      : "border-slate-200 bg-white";

  return (
    <div className={`rounded-2xl border ${toneClasses} shadow-sm`}>
      <div className="px-5 pt-5 pb-3">
        <div className="text-base font-semibold text-slate-900">{title}</div>
        {subtitle ? <div className="mt-1 text-sm text-slate-600">{subtitle}</div> : null}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label className="block text-xs font-medium text-slate-700">{label}</label>
        {hint ? <span className="text-[11px] text-slate-500">{hint}</span> : null}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

// ===== Druckstabile SVG-Grafiken =====

function buildLinePath(values: number[], w: number, h: number, pad: number, maxY: number) {
  if (!values || values.length === 0) return "";
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const n = values.length;

  const x = (i: number) => pad + (innerW * i) / Math.max(1, n - 1);
  const y = (v: number) => pad + innerH - (innerH * v) / Math.max(1, maxY);

  let d = `M ${x(0)} ${y(values[0])}`;
  for (let i = 1; i < n; i++) d += ` L ${x(i)} ${y(values[i])}`;
  return d;
}

function MiniCostChart({
  seriesFossil,
  seriesHP,
  labelFossil = "Fossil",
  labelHP = "Wärmepumpe",
}: {
  seriesFossil: number[];
  seriesHP: number[];
  labelFossil?: string;
  labelHP?: string;
}) {
  const w = 820;
  const h = 240;
  const pad = 30;

  const maxY = Math.max(
    1,
    ...seriesFossil.map((v) => Number(v || 0)),
    ...seriesHP.map((v) => Number(v || 0))
  );

  const dF = buildLinePath(seriesFossil, w, h, pad, maxY);
  const dH = buildLinePath(seriesHP, w, h, pad, maxY);

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>
        Kumulierte Kosten im Zeitverlauf
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${w} ${h}`}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Kumulierte Kosten"
      >
        <rect x="0" y="0" width={w} height={h} fill="#ffffff" />
        <rect x="0.5" y="0.5" width={w - 1} height={h - 1} fill="none" stroke="#e2e8f0" />

        {[0.25, 0.5, 0.75].map((p, i) => (
          <line
            key={i}
            x1={pad}
            x2={w - pad}
            y1={pad + (h - pad * 2) * p}
            y2={pad + (h - pad * 2) * p}
            stroke="#f1f5f9"
          />
        ))}

        <line x1={pad} x2={w - pad} y1={h - pad} y2={h - pad} stroke="#e2e8f0" />
        <line x1={pad} x2={pad} y1={pad} y2={h - pad} stroke="#e2e8f0" />

        {/* Fossil rot, WP blau (CI-konsistent) */}
        <path d={dF} fill="none" stroke="#ef4444" strokeWidth="3" />
        <path d={dH} fill="none" stroke="#2563eb" strokeWidth="3" />

        <g transform={`translate(${pad}, ${10})`}>
          <rect x="0" y="0" width="10" height="10" fill="#ef4444" />
          <text x="14" y="10" fontSize="12" fill="#334155">
            {labelFossil}
          </text>

          <rect x="110" y="0" width="10" height="10" fill="#2563eb" />
          <text x="124" y="10" fontSize="12" fill="#334155">
            {labelHP}
          </text>
        </g>

        <text x={pad} y={pad - 8} fontSize="11" fill="#64748b">
          max ≈ {Math.round(maxY).toLocaleString("de-DE")} €
        </text>
      </svg>
    </div>
  );
}

function MiniTotalBarChart({
  fossil,
  hp,
  labelFossil = "Fossil",
  labelHP = "Wärmepumpe",
}: {
  fossil: number;
  hp: number;
  labelFossil?: string;
  labelHP?: string;
}) {
  const w = 820;
  const h = 220;
  const pad = 30;
  const barW = 220;
  const gap = 120;

  const maxY = Math.max(1, Number(fossil || 0), Number(hp || 0));
  const innerH = h - pad * 2;
  const scale = (v: number) => (innerH * v) / maxY;

  const fH = scale(Number(fossil || 0));
  const hH = scale(Number(hp || 0));

  const x1 = pad + 120;
  const x2 = x1 + barW + gap;
  const yBase = h - pad;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>
        Gesamtkosten im Zeitraum
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${w} ${h}`}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Gesamtkosten Balken"
      >
        <rect x="0" y="0" width={w} height={h} fill="#ffffff" />
        <rect x="0.5" y="0.5" width={w - 1} height={h - 1} fill="none" stroke="#e2e8f0" />

        <line x1={pad} x2={w - pad} y1={yBase} y2={yBase} stroke="#e2e8f0" />
        <line x1={pad} x2={pad} y1={pad} y2={yBase} stroke="#e2e8f0" />

        {/* Fossil rot, WP blau (wie im Liniendiagramm) */}
        <rect x={x1} y={yBase - fH} width={barW} height={fH} fill="#ef4444" />
        <rect x={x2} y={yBase - hH} width={barW} height={hH} fill="#2563eb" />

        <text x={x1 + barW / 2} y={yBase + 18} fontSize="12" fill="#334155" textAnchor="middle">
          {labelFossil}
        </text>
        <text x={x2 + barW / 2} y={yBase + 18} fontSize="12" fill="#334155" textAnchor="middle">
          {labelHP}
        </text>

        <text
          x={x1 + barW / 2}
          y={yBase - fH - 8}
          fontSize="12"
          fill="#0f172a"
          textAnchor="middle"
          fontWeight="700"
        >
          {Math.round(Number(fossil || 0)).toLocaleString("de-DE")} €
        </text>
        <text
          x={x2 + barW / 2}
          y={yBase - hH - 8}
          fontSize="12"
          fill="#0f172a"
          textAnchor="middle"
          fontWeight="700"
        >
          {Math.round(Number(hp || 0)).toLocaleString("de-DE")} €
        </text>

        <text x={pad} y={pad - 8} fontSize="11" fill="#64748b">
          max ≈ {Math.round(maxY).toLocaleString("de-DE")} €
        </text>
      </svg>
    </div>
  );
}

// ===== Print Modal (Portal an body) =====

function PrintModal({
  open,
  onClose,
  role,
  form,
  result,
}: {
  open: boolean;
  onClose: () => void;
  role: Role;
  form: FormState;
  result: CalcResult;
}) {
  const totals =
    role === "vermieter"
      ? { fossil: result.totalLandlordFossil, wp: result.totalLandlordHP, savings: result.savingsLandlord }
      : role === "mieter"
      ? { fossil: result.totalTenantFossil, wp: result.totalTenantHP, savings: result.savingsTenant }
      : { fossil: result.totalOwnerFossil, wp: result.totalOwnerHP, savings: result.savingsOwner };

  const series =
    role === "vermieter"
      ? { fossil: result.cumLandlordFossil, hp: result.cumLandlordHP }
      : role === "mieter"
      ? { fossil: result.cumTenantFossil, hp: result.cumTenantHP }
      : { fossil: result.cumOwnerFossil, hp: result.cumOwnerHP };

  const narrativeInput: NarrativeInput = useMemo(() => {
    const years = form.years ?? 20;
    if (role === "vermieter") {
      return {
        years,
        savings: result.savingsLandlord,
        totalFossil: result.totalLandlordFossil,
        payback: result.extraInvest <= 0 ? null : result.paybackLandlord,
      };
    }
    if (role === "mieter") {
      return {
        years,
        savings: result.savingsTenant,
        totalFossil: result.totalTenantFossil,
        payback: null,
      };
    }
    return {
      years,
      savings: result.savingsOwner,
      totalFossil: result.totalOwnerFossil,
      payback: result.extraInvest <= 0 ? null : result.paybackOwner,
    };
  }, [role, form.years, result]);

  const narrative = useMemo(() => getNarrative(role, narrativeInput), [role, narrativeInput]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!open || !mounted) return null;

  const modal = (
    <div id="print-portal-root" className="print-modal-overlay">
      <div className="print-modal">
        <div className="print-modal-bar">
          <div className="text-sm font-semibold">Bericht</div>
          <div className="flex gap-2">
            <button
              type="button"
              className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50 text-sm font-medium"
              onClick={async () => {
                const img = document.querySelector<HTMLImageElement>("#printArea img");
                if (img && !img.complete) {
                  await new Promise<void>((resolve) => {
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                  });
                }
                requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
              }}
            >
              Drucken
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50 text-sm font-medium"
              onClick={onClose}
            >
              Schließen
            </button>
          </div>
        </div>

        <div id="printArea" className="report">
          <div className="report-header print-avoid-break">
            <img className="report-logo" src="/logo.png" alt="Firmenlogo" />
            <div className="report-head-right">
              <div className="report-title">Heizungs-Vergleich – Bericht</div>
              <div className="report-muted">
                Rolle:{" "}
                <b>
                  {role === "eigentuemer"
                    ? "Eigentümer (Selbstnutzer)"
                    : role === "vermieter"
                    ? "Vermieter"
                    : "Mieter"}
                </b>
                <br />
                Datum: {new Date().toLocaleString("de-DE")}
              </div>
            </div>
          </div>

          {/* Narrative */}
          <div className="report-card print-avoid-break">
            <div className="report-h2">{narrative.headline}</div>

            <div className="report-summary">
              <div className="report-summary-label">Kurzfazit</div>
              <div className="report-summary-text">{narrative.short}</div>
            </div>

            <div className="report-detail">
              <div className="report-detail-label">Einordnung</div>
              <div className="report-detail-text">{narrative.detail}</div>
            </div>

            <div className="report-next">
              <div className="report-h3">Nächste Schritte</div>
              <ul className="report-ul">
                {narrative.nextSteps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* KPIs */}
          <div className="print-chunk">
            <div className="report-kpis">
              <div className="report-card">
                <div className="report-muted" style={{ fontWeight: 700 }}>
                  Gesamtkosten fossil
                </div>
                <div className="report-kpi">{formatEuro(totals.fossil, 0)}</div>
              </div>
              <div className="report-card">
                <div className="report-muted" style={{ fontWeight: 700 }}>
                  Gesamtkosten Wärmepumpe
                </div>
                <div className="report-kpi">{formatEuro(totals.wp, 0)}</div>
              </div>
              <div className="report-card">
                <div className="report-muted" style={{ fontWeight: 700 }}>
                  Wirtschaftlicher Effekt
                </div>
                <div className="report-kpi">{formatEuro(totals.savings, 0)}</div>
                <div className="report-muted">(positiv = Vorteil)</div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="print-chunk">
            <MiniCostChart seriesFossil={series.fossil} seriesHP={series.hp} />
          </div>
          <div className="print-chunk">
            <MiniTotalBarChart fossil={totals.fossil} hp={totals.wp} />
          </div>

          {/* Assumptions on new page (2–3 pages target) */}
          <div className="report-section print-page-break">
            <div className="report-h3">Grundannahmen</div>
            <table className="report-table">
              <tbody>
                <tr>
                  <th>Zeitraum</th>
                  <td>{form.years} Jahre</td>
                </tr>
                <tr>
                  <th>Heizwärmebedarf</th>
                  <td>{form.heatDemand} kWh/a</td>
                </tr>
                <tr>
                  <th>Fläche / Wohneinheiten</th>
                  <td>
                    {form.area} m² / {form.units} WE
                  </td>
                </tr>
                <tr>
                  <th>Bestehende Heizung</th>
                  <td>
                    {form.carrierFossil}, Preis {formatCt(form.priceFossil0)} · Steigerung {form.incFossil}%/a · Wartung{" "}
                    {formatEuro(form.maintFossil, 0)}/a
                  </td>
                </tr>
                <tr>
                  <th>Wärmepumpe</th>
                  <td>
                    {form.carrierHP}, Preis {formatCt(form.priceEl0)} · Steigerung {form.incEl}%/a · JAZ {form.jaz} · Wartung{" "}
                    {formatEuro(form.maintHP, 0)}/a
                  </td>
                </tr>
                <tr>
                  <th>Investitionen</th>
                  <td>
                    Fossil {formatEuro(form.investFossil, 0)} | WP {formatEuro(form.investHP, 0)} | Förderung{" "}
                    {formatEuro(form.subsidyHP, 0)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="report-muted" style={{ marginTop: 10 }}>
              Hinweis: Vereinfachtes Modell. Alle Angaben ohne Gewähr; maßgeblich sind Angebote, reale Anlagenwerte und aktuelle Förderbedingungen.
            </div>
          </div>

          <div className="report-footer">
            <span>Brüser Energieberatung · Heizungs-Vergleich</span>
            <span>{new Date().toLocaleDateString("de-DE")}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

export default function ToolPage() {
  const [tab, setTab] = useState<"vergleich" | "foerder">("vergleich");
  const [role, setRole] = useState<Role>("eigentuemer");

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
  const [showPrint, setShowPrint] = useState(false);

  function updateField<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({
      ...prev,
      [key]: typeof prev[key] === "number" ? Number(value.replace(",", ".")) : (value as any),
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
      note: "Eigentümer trägt Investition, Energie, Wartung und 100% der CO₂-Kosten.",
    };
  }, [result, role]);

  const chartData = useMemo(() => {
    if (!result || !perspective) return [];
    return result.rows.map((_, idx) => ({
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
    <div className="max-w-6xl mx-auto px-4 py-10 text-sm">
      <style jsx global>{`
        .print-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          z-index: 9999;
        }
        .print-modal {
          width: min(980px, 100%);
          height: min(92vh, 100%);
          background: white;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid #e2e8f0;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
          display: flex;
          flex-direction: column;
        }
        .print-modal-bar {
          padding: 12px 14px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #ffffff;
        }

        .report {
          padding: 20px;
          overflow: auto;
          color: #0f172a;
          font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        }
        .report-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .report-logo {
          height: 56px;
          width: auto;
        }
        .report-head-right {
          text-align: right;
        }
        .report-title {
          font-size: 20px;
          font-weight: 800;
          margin: 0;
        }
        .report-muted {
          color: #64748b;
          font-size: 12px;
        }
        .report-card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px;
          background: #fff;
        }
        .report-h2 {
          font-size: 14px;
          font-weight: 800;
        }
        .report-h3 {
          font-size: 13px;
          font-weight: 800;
        }
        .report-ul {
          margin: 6px 0 0 18px;
          font-size: 13px;
        }
        .report-kpis {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 16px;
        }
        .report-kpi {
          font-size: 18px;
          font-weight: 800;
          margin-top: 6px;
        }
        .report-section {
          margin-top: 14px;
        }
        .report-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
          margin-top: 6px;
        }
        .report-table th,
        .report-table td {
          border-bottom: 1px solid #e2e8f0;
          padding: 6px 4px;
          text-align: left;
        }
        .report-table th {
          width: 220px;
          color: #64748b;
          font-weight: 800;
        }

        .report-summary {
          margin-top: 10px;
          padding: 10px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
        }
        .report-summary-label,
        .report-detail-label {
          font-size: 12px;
          font-weight: 800;
          color: #334155;
          margin-bottom: 4px;
        }
        .report-summary-text,
        .report-detail-text {
          font-size: 13px;
          line-height: 1.45;
          color: #0f172a;
        }
        .report-detail {
          margin-top: 10px;
        }
        .report-next {
          margin-top: 12px;
        }

        @media print {
          body > * {
            display: none !important;
          }

          #print-portal-root {
            display: block !important;
            position: static !important;
            background: transparent !important;
            padding: 0 !important;
          }

          #print-portal-root .print-modal-bar {
            display: none !important;
          }

          #print-portal-root .print-modal {
            height: auto !important;
            width: auto !important;
            border: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }

          #printArea {
            overflow: visible !important;
          }

          body {
            margin: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          @page {
            size: A4;
            margin: 12mm;
          }

          #printArea {
            padding-bottom: 18mm !important;
          }

          .report-card,
          .report-kpis,
          .print-avoid-break,
          .print-avoid-break * {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .print-chunk {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .print-page-break {
            break-before: page !important;
            page-break-before: always !important;
          }

          .report-header {
            break-after: avoid !important;
            page-break-after: avoid !important;
          }

          .report-kpis {
            grid-template-columns: 1fr !important;
          }

          .report-footer {
            position: fixed;
            left: 12mm;
            right: 12mm;
            bottom: 8mm;
            font-size: 10px;
            color: #64748b;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1px solid #e2e8f0;
            padding-top: 4mm;
            background: white;
          }
        }
      `}</style>

      {/* Premium Header */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <div className="text-3xl font-semibold text-slate-900 leading-tight">
            Heizungs-Vergleich
          </div>
          <div className="mt-2 text-slate-600 max-w-2xl">
            Eine verständliche Wirtschaftlichkeits-Einschätzung für <b>Fossil</b> vs. <b>Wärmepumpe</b> – inkl. druckfähigem Bericht.
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          Public-Version (selbsterklärend)
        </div>
      </div>

      {/* Rolle */}
      <Section
        title="1) Ihre Situation"
        subtitle="Wir bewerten je nach Rolle unterschiedliche Kostenbestandteile. So wird das Ergebnis realistischer."
      >
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Rolle / Zielgruppe" hint="wirkt sich auf die Bewertung aus">
            <select
              className="w-full border rounded-xl px-3 py-2 bg-white"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="eigentuemer">Eigentümer (Selbstnutzer)</option>
              <option value="vermieter">Vermieter</option>
              <option value="mieter">Mieter</option>
            </select>
          </Field>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-sm font-semibold text-slate-900">{hint.title}</div>
            <div className="mt-1 text-xs text-slate-600">{hint.text}</div>
            <div className="mt-2 text-[11px] text-slate-500">
              Hinweis: vereinfachtes Modell. Ziel ist eine robuste, erklärbare Entscheidungshilfe.
            </div>
          </div>
        </div>
      </Section>

      {/* Tabs */}
      <div className="mt-8 flex items-center gap-2 border-b">
        <button
          className={
            "px-4 py-3 text-sm -mb-px border-b-2 " +
            (tab === "vergleich"
              ? "border-slate-900 text-slate-900 font-medium"
              : "border-transparent text-slate-500 hover:text-slate-800")
          }
          onClick={() => setTab("vergleich")}
        >
          Wirtschaftlichkeit bewerten
        </button>
        <button
          className={
            "px-4 py-3 text-sm -mb-px border-b-2 " +
            (tab === "foerder"
              ? "border-slate-900 text-slate-900 font-medium"
              : "border-transparent text-slate-500 hover:text-slate-800")
          }
          onClick={() => setTab("foerder")}
        >
          Fördermöglichkeiten prüfen
        </button>
      </div>

      {tab === "vergleich" && (
        <>
          <form onSubmit={handleCalc} className="mt-6 grid gap-6">
            <Section
              title="2) Gebäude & Zeitraum"
              subtitle="Diese Angaben bestimmen die Größenordnung der Kosten und die Vergleichbarkeit."
            >
              <div className="grid md:grid-cols-4 gap-4">
                <Field label="Heizwärmebedarf (kWh/Jahr)" hint="z. B. aus Abrechnung">
                  <input
                    type="number"
                    className="w-full border rounded-xl px-3 py-2"
                    value={form.heatDemand}
                    onChange={(e) => updateField("heatDemand", e.target.value)}
                  />
                </Field>

                <Field label="Gebäudefläche (m²)" hint="beeinflusst CO₂/m²">
                  <input
                    type="number"
                    className="w-full border rounded-xl px-3 py-2"
                    value={form.area}
                    onChange={(e) => updateField("area", e.target.value)}
                  />
                </Field>

                <Field label="Wohneinheiten" hint="für Förderannahmen">
                  <input
                    type="number"
                    className="w-full border rounded-xl px-3 py-2"
                    value={form.units}
                    onChange={(e) => updateField("units", e.target.value)}
                  />
                </Field>

                <Field label="Betrachtungszeitraum (Jahre)" hint="typisch: 15–25">
                  <input
                    type="number"
                    className="w-full border rounded-xl px-3 py-2"
                    value={form.years}
                    onChange={(e) => updateField("years", e.target.value)}
                  />
                </Field>
              </div>

              <details className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium text-slate-800">
                  Experteneinstellungen (CO₂-Preisszenario)
                </summary>
                <div className="mt-3 grid md:grid-cols-2 gap-4">
                  <Field label="CO₂-Preisszenario" hint="wirkt auf CO₂-Kosten">
                    <select
                      className="w-full border rounded-xl px-3 py-2 bg-white"
                      value={form.scenario}
                      onChange={(e) => updateField("scenario", e.target.value as ScenarioName)}
                    >
                      <option>Sehr niedrig</option>
                      <option>Niedrig</option>
                      <option>Experten</option>
                      <option>Hoch</option>
                      <option>Sehr hoch</option>
                    </select>
                  </Field>
                  <div className="text-xs text-slate-600 leading-relaxed">
                    Wenn Sie unsicher sind: lassen Sie <b>„Experten“</b> stehen. Der Bericht zeigt die Annahmen transparent.
                  </div>
                </div>
              </details>
            </Section>

            <div className="grid md:grid-cols-2 gap-6">
              <Section
                title="3) Bestehende Heizung (Referenz)"
                subtitle="Damit vergleichen wir die Wärmepumpe. Je realistischer der Ausgangspunkt, desto besser das Ergebnis."
                tone="fossil"
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Energieträger" hint="Ausgangspunkt">
                    <select
                      className="w-full border rounded-xl px-3 py-2 bg-white"
                      value={form.carrierFossil}
                      onChange={(e) => updateField("carrierFossil", e.target.value as CarrierFossil)}
                    >
                      <option value="Erdgas">Erdgas</option>
                      <option value="Flüssiggas">Flüssiggas</option>
                      <option value="Heizöl">Heizöl</option>
                      <option value="Pellets">Pellets</option>
                    </select>
                  </Field>

                  <Field label="Wirkungsgrad (%)" hint="typisch: 80–95">
                    <input
                      type="number"
                      className="w-full border rounded-xl px-3 py-2"
                      value={form.effFossil}
                      onChange={(e) => updateField("effFossil", e.target.value)}
                    />
                  </Field>

                  <Field label="Preis heute (ct/kWh)" hint="aus Rechnung">
                    <input
                      type="number"
                      className="w-full border rounded-xl px-3 py-2"
                      value={form.priceFossil0}
                      onChange={(e) => updateField("priceFossil0", e.target.value)}
                    />
                  </Field>

                  <Field label="Preissteigerung (%/a)" hint="z. B. 2–5">
                    <input
                      type="number"
                      className="w-full border rounded-xl px-3 py-2"
                      value={form.incFossil}
                      onChange={(e) => updateField("incFossil", e.target.value)}
                    />
                  </Field>

                  <Field label="Wartung/Fixkosten (€/a)" hint="Schornsteinfeger etc.">
                    <input
                      type="number"
                      className="w-full border rounded-xl px-3 py-2"
                      value={form.maintFossil}
                      onChange={(e) => updateField("maintFossil", e.target.value)}
                    />
                  </Field>

                  <details className="rounded-xl border border-slate-200 bg-white px-4 py-3 md:col-span-2">
                    <summary className="cursor-pointer text-sm font-medium text-slate-800">
                      Investition (optional)
                    </summary>
                    <div className="mt-3 grid md:grid-cols-2 gap-4">
                      <Field label="Investitionskosten fossil (€, einmalig)" hint="nur falls relevant">
                        <input
                          type="number"
                          className="w-full border rounded-xl px-3 py-2"
                          value={form.investFossil}
                          onChange={(e) => updateField("investFossil", e.target.value)}
                        />
                      </Field>
                      <div className="text-xs text-slate-600 leading-relaxed">
                        Wenn die Anlage ohnehin erneuert werden muss, ist der Vergleich aussagekräftiger.
                      </div>
                    </div>
                  </details>
                </div>
              </Section>

              <Section
                title="4) Wärmepumpe (Alternative)"
                subtitle="Die Wirtschaftlichkeit hängt vor allem von JAZ, Strompreis und Förderung ab."
                tone="hp"
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="Stromquelle" hint="Einfluss auf CO₂">
                    <select
                      className="w-full border rounded-xl px-3 py-2 bg-white"
                      value={form.carrierHP}
                      onChange={(e) => updateField("carrierHP", e.target.value as CarrierHP)}
                    >
                      <option value="Strom Stromix">Strom Stromix</option>
                      <option value="Strom Erneuerbar">Strom Erneuerbar</option>
                    </select>
                  </Field>

                  <Field label="JAZ (Jahresarbeitszahl)" hint="typisch 2,5–4,0">
                    <input
                      type="number"
                      className="w-full border rounded-xl px-3 py-2"
                      value={form.jaz}
                      onChange={(e) => updateField("jaz", e.target.value)}
                    />
                  </Field>

                  <Field label="Strompreis heute (ct/kWh)" hint="z. B. 25–40">
                    <input
                      type="number"
                      className="w-full border rounded-xl px-3 py-2"
                      value={form.priceEl0}
                      onChange={(e) => updateField("priceEl0", e.target.value)}
                    />
                  </Field>

                  <Field label="Preissteigerung Strom (%/a)" hint="z. B. 1–3">
                    <input
                      type="number"
                      className="w-full border rounded-xl px-3 py-2"
                      value={form.incEl}
                      onChange={(e) => updateField("incEl", e.target.value)}
                    />
                  </Field>

                  <Field label="Investitionskosten WP (€, brutto)" hint="Angebot / Schätzung">
                    <input
                      type="number"
                      className="w-full border rounded-xl px-3 py-2"
                      value={form.investHP}
                      onChange={(e) => updateField("investHP", e.target.value)}
                    />
                  </Field>

                  <Field label="Förderung (€, Zuschuss)" hint="aus Förderrechner">
                    <input
                      type="number"
                      className="w-full border rounded-xl px-3 py-2"
                      value={form.subsidyHP}
                      onChange={(e) => updateField("subsidyHP", e.target.value)}
                    />
                    <div className="mt-1 text-[11px] text-slate-500">
                      Tipp: Im Tab „Fördermöglichkeiten prüfen“ berechnen und übernehmen.
                    </div>
                  </Field>

                  <Field label="Wartung/Fixkosten (€/a)" hint="typisch geringer">
                    <input
                      type="number"
                      className="w-full border rounded-xl px-3 py-2"
                      value={form.maintHP}
                      onChange={(e) => updateField("maintHP", e.target.value)}
                    />
                  </Field>

                  <div className="md:col-span-2 rounded-xl border border-blue-200 bg-white px-4 py-3 text-xs text-slate-700">
                    Wenn Sie unsicher sind: lassen Sie JAZ bei <b>3,0</b>. Im Bericht weisen wir darauf hin, dass reale Werte (Vorlauftemperatur, Heizflächen) entscheidend sind.
                  </div>
                </div>
              </Section>
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="text-xs text-slate-600">
                Öffentlich nutzbar: Bitte nur Werte eingeben, die Sie teilen möchten. Es werden keine personenbezogenen Daten benötigt.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-5 py-3 rounded-2xl bg-slate-900 text-white text-sm font-semibold disabled:opacity-60 hover:bg-slate-800"
              >
                {loading ? "Bewertung läuft ..." : "Wirtschaftlichkeit bewerten"}
              </button>
            </div>
          </form>

          {error && <div className="mt-5 text-sm text-red-600">{error}</div>}

          {result && perspective && (
            <div className="mt-8 grid gap-6">
              <Section
                title="5) Ihre Entscheidung"
                subtitle="Das Ergebnis ist so formuliert, dass es auch ohne Beratung verständlich bleibt – inkl. Bericht."
                tone="result"
              >
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-sm font-semibold text-slate-900">{hint.title}</div>
                  <div className="mt-1 text-xs text-slate-600">{hint.text}</div>
                  <div className="mt-2 text-[11px] text-slate-500">
                    {perspective.label}: {perspective.note}
                  </div>
                </div>

                <div className="mt-4 grid md:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs text-slate-500">Mehrinvestition Wärmepumpe (netto)</div>
                    <div className="text-xl font-semibold text-slate-900 mt-1">
                      {formatEuro(result.extraInvest, 0)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Netto = WP Invest minus Förderung (vereinfacht)
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs text-slate-500">Amortisation ({perspective.label})</div>
                    <div className="text-xl font-semibold text-slate-900 mt-1">
                      {result.extraInvest <= 0
                        ? "Keine Mehrinvestition"
                        : perspective.payback
                        ? `${perspective.payback}. Jahr`
                        : "Keine vollständige Amortisation"}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Falls keine Amortisation: Ergebnis mit anderen Annahmen prüfen.
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs text-slate-500">Wirtschaftlicher Effekt ({perspective.label})</div>
                    <div
                      className={
                        "text-xl font-semibold mt-1 " +
                        (perspective.savings > 0
                          ? "text-emerald-700"
                          : perspective.savings < 0
                          ? "text-rose-700"
                          : "text-slate-900")
                      }
                    >
                      {(perspective.savings >= 0 ? "Vorteil: " : "Nachteil: ") +
                        formatEuro(Math.abs(perspective.savings), 0)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Positiv bedeutet: WP ist im Zeitraum günstiger.
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="text-sm text-slate-700">
                    <b>Tipp:</b> Erstellen Sie den Bericht direkt nach der Berechnung.
                  </div>
                  <button
                    type="button"
                    className="px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-900 text-sm font-semibold hover:bg-slate-50"
                    onClick={() => setShowPrint(true)}
                  >
                    Bericht erstellen & drucken
                  </button>
                </div>
              </Section>

              {/* Interaktive Charts (Screen) */}
              <Section title="Verlauf & Vergleich" subtitle="Zur schnellen Einordnung – im Bericht sind die Grafiken druckstabil." tone="result">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs text-slate-500 mb-2">
                      Kumulierte Kosten ({perspective.label})
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={chartData}
                          margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                        >
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(v: any) => formatEuro(Number(v), 0)} />
                          <Line type="monotone" dataKey="kumFossil" name="kumuliert fossil" stroke="#ef4444" dot={false} />
                          <Line type="monotone" dataKey="kumHP" name="kumuliert Wärmepumpe" stroke="#2563eb" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-xs text-slate-500 mb-2">Gesamtkosten ({perspective.label})</div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={totalChartData}
                          margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                        >
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(v: any) => formatEuro(Number(v), 0)} />
                          <Bar dataKey="kosten" name="Gesamtkosten">
                            {totalChartData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.name === "Fossil" ? "#ef4444" : "#2563eb"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <details className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 py-4">
                  <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                    Details (jährliche Übersicht)
                  </summary>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-2">Jahr</th>
                          <th className="text-right py-2 px-2">CO₂-Preis</th>
                          <th className="text-right py-2 px-2">Kosten fossil</th>
                          <th className="text-right py-2 px-2">Kosten WP</th>
                          <th className="text-right py-2 px-2">kumulierte Einsparung</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows.map((row) => {
                          const annualF = (row as any)[
                            role === "vermieter"
                              ? "landlordAnnualFossil"
                              : role === "mieter"
                              ? "tenantAnnualFossil"
                              : "ownerAnnualFossil"
                          ] as number;

                          const annualH = (row as any)[
                            role === "vermieter"
                              ? "landlordAnnualHP"
                              : role === "mieter"
                              ? "tenantAnnualHP"
                              : "ownerAnnualHP"
                          ] as number;

                          const cumS = (row as any)[
                            role === "vermieter"
                              ? "landlordCumSavings"
                              : role === "mieter"
                              ? "tenantCumSavings"
                              : "ownerCumSavings"
                          ] as number;

                          return (
                            <tr key={row.year} className="border-b">
                              <td className="py-2 pr-2">{row.year}</td>
                              <td className="py-2 px-2 text-right">
                                {row.co2Price.toLocaleString("de-DE", { maximumFractionDigits: 0 })} €
                              </td>
                              <td className="py-2 px-2 text-right">{formatEuro(annualF, 0)}</td>
                              <td className="py-2 px-2 text-right">{formatEuro(annualH, 0)}</td>
                              <td className="py-2 px-2 text-right">{formatEuro(cumS, 0)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </details>
              </Section>

              <PrintModal open={showPrint} onClose={() => setShowPrint(false)} role={role} form={form} result={result} />
            </div>
          )}
        </>
      )}

      {tab === "foerder" && (
        <div className="mt-6 grid md:grid-cols-2 gap-6">
          <Section
            title="Förderung berechnen"
            subtitle="Vereinfachte Auswahl. Ziel ist eine belastbare Größenordnung – nicht die rechtliche Bewertung."
            tone="neutral"
          >
            <form onSubmit={handleFoerderCalc} className="space-y-4">
              <Field label="Gebäudeart">
                <select
                  className="w-full border rounded-xl px-3 py-2 bg-white"
                  value={foerderForm.art}
                  onChange={(e) =>
                    updateFoerderField("art", e.target.value as "wohn" | "nichtwohn")
                  }
                >
                  <option value="wohn">Wohngebäude</option>
                  <option value="nichtwohn">Nichtwohngebäude</option>
                </select>
              </Field>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs text-slate-500">Investitionskosten Wärmepumpe (aus Vergleich)</div>
                <div className="text-lg font-semibold text-slate-900">{formatEuro(form.investHP, 0)}</div>
                <div className="text-[11px] text-slate-500 mt-1">Sie ändern den Wert im Tab „Wirtschaftlichkeit bewerten“.</div>
              </div>

              {foerderForm.art === "wohn" ? (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-900">Wohngebäude-Optionen</div>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={foerderForm.wohnKlimaBonus}
                      onChange={(e) => updateFoerderField("wohnKlimaBonus", e.target.checked)}
                    />
                    Klima-Geschwindigkeitsbonus
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={foerderForm.wohnEinkommensBonus}
                      onChange={(e) =>
                        updateFoerderField("wohnEinkommensBonus", e.target.checked)
                      }
                    />
                    Einkommensbonus
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={foerderForm.wohnEffizienzBonus}
                      onChange={(e) =>
                        updateFoerderField("wohnEffizienzBonus", e.target.checked)
                      }
                    />
                    Effizienzbonus
                  </label>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-900">Nichtwohngebäude-Optionen</div>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={foerderForm.nwgEffizienzBonus}
                      onChange={(e) => updateFoerderField("nwgEffizienzBonus", e.target.checked)}
                    />
                    Effizienzbonus
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={foerderLoading}
                className="w-full px-5 py-3 rounded-2xl bg-slate-900 text-white text-sm font-semibold disabled:opacity-60 hover:bg-slate-800"
              >
                {foerderLoading ? "Berechnung läuft ..." : "Förderung berechnen"}
              </button>

              {foerderError && <div className="text-sm text-red-600">{foerderError}</div>}
            </form>
          </Section>

          <Section title="Ergebnis & Übernahme" subtitle="Übernehmen Sie den Zuschuss direkt in den Vergleich." tone="neutral">
            {!foerderResult ? (
              <div className="text-slate-600 text-sm">
                Berechnen Sie rechts die Förderung. Danach können Sie den Zuschuss per Button übernehmen.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="text-xs text-slate-500">Förderquote</div>
                  <div className="text-xl font-semibold text-slate-900">
                    {foerderResult.foerderProzent.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="text-xs text-slate-500">Geschätzter Zuschuss</div>
                  <div className="text-xl font-semibold text-slate-900">{formatEuro(foerderResult.foerderEuro, 0)}</div>

                  <button
                    type="button"
                    className={
                      "w-full mt-3 px-5 py-3 rounded-2xl text-sm font-semibold " +
                      (subsidyApplied
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-900 text-white hover:bg-slate-800")
                    }
                    onClick={() => {
                      setForm((prev) => ({ ...prev, subsidyHP: Math.round(foerderResult.foerderEuro) }));
                      setSubsidyApplied(true);
                      setTab("vergleich");
                    }}
                  >
                    {subsidyApplied ? "Zuschuss übernommen ✓" : "Zuschuss in Vergleich übernehmen"}
                  </button>

                  <div className="mt-2 text-[11px] text-slate-500">
                    Springt automatisch zurück zum Vergleich und trägt den Zuschuss ein.
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="text-xs text-slate-500">Verbleibende Investition nach Zuschuss</div>
                  <div className="text-xl font-semibold text-slate-900">{formatEuro(foerderResult.restInvest, 0)}</div>
                  <div className="mt-1 text-[11px] text-slate-500">Alle Angaben ohne Gewähr.</div>
                </div>
              </div>
            )}
          </Section>
        </div>
      )}

      {/* Public Footer */}
      <div className="mt-10 text-xs text-slate-500 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>© {new Date().getFullYear()} Brüser Energieberatung · Dieses Tool ist eine Entscheidungshilfe.</div>
        <div className="flex gap-3">
          <span className="underline underline-offset-4 cursor-pointer">Impressum</span>
          <span className="underline underline-offset-4 cursor-pointer">Datenschutz</span>
        </div>
      </div>
    </div>
  );
}
