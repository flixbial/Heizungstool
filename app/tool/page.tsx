"use client";

import { useEffect, useMemo, useState } from "react";
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

// ✅ narrative modular (leicht erweiterbar)
function getNarrative(role: Role, form: FormState, result: CalcResult) {
  const years = form.years ?? 20;

  const pick = () => {
    if (role === "vermieter")
      return { label: "Vermieter", savings: result.savingsLandlord, payback: result.paybackLandlord, totalFossil: result.totalLandlordFossil };
    if (role === "mieter")
      return { label: "Mieter", savings: result.savingsTenant, payback: null, totalFossil: result.totalTenantFossil };
    return { label: "Eigentümer (Selbstnutzer)", savings: result.savingsOwner, payback: result.paybackOwner, totalFossil: result.totalOwnerFossil };
  };

  const p = pick();
  const abs = Math.abs(p.savings || 0);
  const monatlich = abs / (years * 12);
  const isAdvantage = (p.savings ?? 0) > 0;
  const isNear = abs < 0.03 * Math.max(1, Number(p.totalFossil || 1));

  const headline =
    isNear ? "Ergebnis nahe am Break-even" : isAdvantage ? "Wärmepumpe wirtschaftlich vorteilhaft" : "Wärmepumpe derzeit wirtschaftlich nachteilig";

  const introByRole: Record<Role, string> = {
    vermieter:
      isNear
        ? `Aus Vermietersicht liegt das Ergebnis nahe am Break-even. Kleine Änderungen bei Förderung, Investition oder CO₂-Preisen können das Ergebnis drehen.`
        : isAdvantage
        ? `Aus Vermietersicht ist die Wärmepumpe vorteilhaft: über ${years} Jahre ergibt sich ein Vorteil von ${formatEuro(abs)}.`
        : `Aus Vermietersicht ist die Wärmepumpe im Szenario nachteilig: über ${years} Jahre ergibt sich ein Nachteil von ${formatEuro(abs)}.`,
    mieter:
      isNear
        ? `Aus Mietersicht liegen die laufenden Kosten nahe beieinander. Das Ergebnis hängt stark an Strompreis, Brennstoffpreis und realer JAZ.`
        : isAdvantage
        ? `Als Mieter*in sinken die laufenden Kosten über ${years} Jahre um ${formatEuro(abs)} (≈ ${formatEuro(monatlich, 0)} / Monat).`
        : `Als Mieter*in steigen die laufenden Kosten über ${years} Jahre um ${formatEuro(abs)} (≈ ${formatEuro(monatlich, 0)} / Monat).`,
    eigentuemer:
      isNear
        ? `Als Selbstnutzer liegt das Ergebnis nahe am Break-even. Schon kleine Änderungen bei JAZ, Strompreis oder Förderung können die Bewertung umkehren.`
        : isAdvantage
        ? `Als Selbstnutzer sparen Sie über ${years} Jahre voraussichtlich ${formatEuro(abs)}.`
        : `Als Selbstnutzer entsteht über ${years} Jahre voraussichtlich ein Nachteil von ${formatEuro(abs)}.`,
  };

  const drivers =
    role === "mieter"
      ? "Treiber sind Strompreis vs. Brennstoffpreis sowie die tatsächlich erreichte Jahresarbeitszahl (JAZ)."
      : "Treiber sind insbesondere Netto-Investition (nach Förderung), CO₂-Kosten (inkl. Aufteilung) und die JAZ.";

  const paybackText =
    role !== "mieter" && (result.extraInvest ?? 0) > 0
      ? p.payback
        ? `Die Mehrinvestition amortisiert sich nach ca. ${p.payback} Jahren (unter den getroffenen Annahmen).`
        : "Innerhalb des Betrachtungszeitraums amortisiert sich die Mehrinvestition nicht vollständig."
      : null;

  const nextStepsByRole: Record<Role, string[]> = {
    vermieter: [
      "Förderfähigkeit prüfen (Gebäudeart/Bonusse) und Zuschuss übernehmen.",
      "Angebote einholen (inkl. Hydraulik/Heizkörpercheck) und Investitionsannahmen validieren.",
      "Sensitivität prüfen: Strom-/Brennstoffpreise, JAZ, CO₂-Szenario.",
    ],
    mieter: [
      "Auf realistische JAZ achten (Hydraulik, Vorlauftemperatur, Heizflächen).",
      "Stromtarif/WP-Tarif prüfen und Brennstoffpreise gegenüberstellen.",
      "Bei Modernisierung: Nebenkosten- und Umlageeffekte transparent klären.",
    ],
    eigentuemer: [
      "Angebote einholen und JAZ realistisch ansetzen (Vorlauf/Heizkörper/Warmwasser).",
      "Förderung optimieren und Zuschuss in die Rechnung übernehmen.",
      "Optional: PV/Wärmestromtarif als Hebel berücksichtigen.",
    ],
  };

  return {
    label: p.label,
    headline,
    intro: introByRole[role],
    drivers,
    paybackText,
    nextSteps: nextStepsByRole[role],
  };
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

  const maxY = Math.max(1, ...seriesFossil.map((v) => Number(v || 0)), ...seriesHP.map((v) => Number(v || 0)));
  const dF = buildLinePath(seriesFossil, w, h, pad, maxY);
  const dH = buildLinePath(seriesHP, w, h, pad, maxY);

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>Kumulierte Kosten (druckstabil)</div>

      <svg width="100%" viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Kumulierte Kosten">
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
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>Gesamtkosten im Zeitraum (druckstabil)</div>

      <svg width="100%" viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Gesamtkosten Balken">
        <rect x="0" y="0" width={w} height={h} fill="#ffffff" />
        <rect x="0.5" y="0.5" width={w - 1} height={h - 1} fill="none" stroke="#e2e8f0" />

        <line x1={pad} x2={w - pad} y1={yBase} y2={yBase} stroke="#e2e8f0" />
        <line x1={pad} x2={pad} y1={pad} y2={yBase} stroke="#e2e8f0" />

        <rect x={x1} y={yBase - fH} width={barW} height={fH} fill="#ef4444" />
        <rect x={x2} y={yBase - hH} width={barW} height={hH} fill="#2563eb" />

        <text x={x1 + barW / 2} y={yBase + 18} fontSize="12" fill="#334155" textAnchor="middle">
          {labelFossil}
        </text>
        <text x={x2 + barW / 2} y={yBase + 18} fontSize="12" fill="#334155" textAnchor="middle">
          {labelHP}
        </text>

        <text x={x1 + barW / 2} y={yBase - fH - 8} fontSize="12" fill="#0f172a" textAnchor="middle" fontWeight="700">
          {Math.round(Number(fossil || 0)).toLocaleString("de-DE")} €
        </text>
        <text x={x2 + barW / 2} y={yBase - hH - 8} fontSize="12" fill="#0f172a" textAnchor="middle" fontWeight="700">
          {Math.round(Number(hp || 0)).toLocaleString("de-DE")} €
        </text>

        <text x={pad} y={pad - 8} fontSize="11" fill="#64748b">
          max ≈ {Math.round(maxY).toLocaleString("de-DE")} €
        </text>
      </svg>
    </div>
  );
}

// ===== Print Modal (Popup-Look) =====

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
  const narrative = useMemo(() => getNarrative(role, form, result), [role, form, result]);

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

  // Optional: ESC schließen
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="print-modal-overlay no-print">
      <div className="print-modal">
        <div className="print-modal-bar no-print">
          <div className="text-sm font-semibold">Bericht</div>
          <div className="flex gap-2">
            <button
              type="button"
              className="px-3 py-2 rounded-lg border bg-white hover:bg-slate-50 text-sm font-medium"
              onClick={() => {
                // sicherstellen, dass Layout steht
                setTimeout(() => window.print(), 50);
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

        {/* ✅ Nur dieser Bereich wird gedruckt */}
        <div id="printArea" className="report">
          <div className="report-header">
            <img className="report-logo" src="/logo.png" alt="Firmenlogo" />
            <div className="report-head-right">
              <div className="report-title">Heizungs-Vergleich – Bericht</div>
              <div className="report-muted">
                Rolle: <b>{narrative.label}</b>
                <br />
                Datum: {new Date().toLocaleString("de-DE")}
              </div>
            </div>
          </div>

          <div className="report-card">
            <div className="report-h2">{narrative.headline}</div>
            <div style={{ marginTop: 6 }}>{narrative.intro}</div>
            <div className="report-muted" style={{ marginTop: 8 }}>
              {narrative.drivers}
            </div>
            {narrative.paybackText && (
              <div style={{ marginTop: 8 }}>
                <b>{narrative.paybackText}</b>
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <div className="report-h3">Nächste Schritte</div>
              <ul className="report-ul">
                {narrative.nextSteps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </div>

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
                Vorteil/Nachteil WP
              </div>
              <div className="report-kpi">{formatEuro(totals.savings, 0)}</div>
              <div className="report-muted">(positiv = Vorteil)</div>
            </div>
          </div>

          <MiniCostChart seriesFossil={series.fossil} seriesHP={series.hp} />
          <MiniTotalBarChart fossil={totals.fossil} hp={totals.wp} />

          <div className="report-section">
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
                  <th>Fläche / WE</th>
                  <td>
                    {form.area} m² / {form.units} WE
                  </td>
                </tr>
                <tr>
                  <th>Fossil</th>
                  <td>
                    {form.carrierFossil}, Preis {form.priceFossil0} ct/kWh, Steigerung {form.incFossil}%/a
                  </td>
                </tr>
                <tr>
                  <th>Wärmepumpe</th>
                  <td>
                    {form.carrierHP}, Preis {form.priceEl0} ct/kWh, Steigerung {form.incEl}%/a, JAZ {form.jaz}
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
              Hinweis: Vereinfachtes Modell. Alle Angaben ohne Gewähr; maßgeblich sind aktuelle Richtlinien, Verträge und reale Anlagenwerte.
            </div>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style jsx global>{`
        /* Modal Layout */
        .print-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          z-index: 50;
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

        /* Report Styles */
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

        /* ✅ PRINT: nur #printArea drucken */
        @media print {
          .no-print {
            display: none !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printArea,
          #printArea * {
            visibility: visible !important;
          }
          #printArea {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
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

  // ✅ Option A: Popup-Modal im selben Tab
  const [showPrint, setShowPrint] = useState(false);

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

          {result && perspective && (
            <section className="space-y-6">
              {/* Druck-Sektion */}
              <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{hint.title}</div>
                  <div className="text-xs text-slate-600 mt-1">{hint.text}</div>
                  <div className="text-[11px] text-slate-500 mt-2">
                    Tipp: Vor dem Drucken einmal „Berechnen“ klicken, damit der Bericht die aktuellen Werte enthält.
                  </div>
                </div>

                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                  onClick={() => setShowPrint(true)}
                >
                  Bericht drucken
                </button>
              </div>

              {/* Hinweistext */}
              <div className="bg-white border rounded-xl p-4 shadow-sm text-[11px] text-slate-600">
                <span className="font-medium">{perspective.label}:</span> {perspective.note}
              </div>

              {/* KPIs */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white border rounded-xl p-4 shadow-sm">
                  <div className="text-xs text-slate-500">Mehrinvestition WP (netto)</div>
                  <div className="text-lg font-semibold">{formatEuro(result.extraInvest, 0)}</div>
                </div>

                <div className="bg-white border rounded-xl p-4 shadow-sm">
                  <div className="text-xs text-slate-500">Amortisation ({perspective.label})</div>
                  <div className="text-lg font-semibold">
                    {result.extraInvest <= 0
                      ? "Keine Mehrinvestition"
                      : perspective.payback
                      ? `${perspective.payback}. Jahr`
                      : "Keine vollständige Amortisation"}
                  </div>
                </div>

                <div className="bg-white border rounded-xl p-4 shadow-sm">
                  <div className="text-xs text-slate-500">Vorteil/Nachteil ({perspective.label})</div>
                  <div
                    className={
                      "text-lg font-semibold " +
                      (perspective.savings > 0 ? "text-emerald-700" : perspective.savings < 0 ? "text-red-700" : "")
                    }
                  >
                    {(perspective.savings >= 0 ? "Vorteil: " : "Nachteil: ") + formatEuro(Math.abs(perspective.savings), 0)}
                  </div>
                </div>
              </div>

              {/* Charts (Screen) */}
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <div className="text-xs text-slate-500 mb-2">Kumulierte Kosten ({perspective.label}) – fossil vs. Wärmepumpe</div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(v: any) => formatEuro(Number(v), 0)} />
                      <Line type="monotone" dataKey="kumFossil" name="kumuliert fossil" stroke="#ef4444" dot={false} />
                      <Line type="monotone" dataKey="kumHP" name="kumuliert Wärmepumpe" stroke="#2563eb" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <div className="text-xs text-slate-500 mb-2">Gesamtkosten ({perspective.label})</div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={totalChartData}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(v: any) => formatEuro(Number(v), 0)} />
                      <Bar dataKey="kosten" name="Gesamtkosten">
                        {totalChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.name === "Fossil" ? "#ef4444" : "#2563eb"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Tabelle */}
              <div className="bg-white border rounded-xl p-4 shadow-sm overflow-x-auto">
                <div className="text-xs text-slate-500 mb-2">Jährliche Übersicht ({perspective.label})</div>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1 pr-2">Jahr</th>
                      <th className="text-right py-1 px-2">CO₂-Preis</th>
                      <th className="text-right py-1 px-2">Kosten fossil</th>
                      <th className="text-right py-1 px-2">Kosten WP</th>
                      <th className="text-right py-1 px-2">kumulierte Einsparung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row) => {
                      const annualF = (row as any)[perspective.annualKeyFossil] as number;
                      const annualH = (row as any)[perspective.annualKeyHP] as number;
                      const cumS = (row as any)[perspective.cumSavingsKey] as number;

                      return (
                        <tr key={row.year} className="border-b">
                          <td className="py-1 pr-2">{row.year}</td>
                          <td className="py-1 px-2 text-right">
                            {row.co2Price.toLocaleString("de-DE", { maximumFractionDigits: 0 })} €
                          </td>
                          <td className="py-1 px-2 text-right">{formatEuro(annualF, 0)}</td>
                          <td className="py-1 px-2 text-right">{formatEuro(annualH, 0)}</td>
                          <td className="py-1 px-2 text-right">{formatEuro(cumS, 0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ✅ Modal für Druck */}
              <PrintModal
                open={showPrint}
                onClose={() => setShowPrint(false)}
                role={role}
                form={form}
                result={result}
              />
            </section>
          )}
        </>
      )}

      {tab === "foerder" && (
        <section className="grid md:grid-cols-2 gap-6">
          <form onSubmit={handleFoerderCalc} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Gebäudeart</label>
              <select
                className="w-full border rounded-lg px-2 py-1.5"
                value={foerderForm.art}
                onChange={(e) => updateFoerderField("art", e.target.value as "wohn" | "nichtwohn")}
              >
                <option value="wohn">Wohngebäude</option>
                <option value="nichtwohn">Nichtwohngebäude</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Investitionskosten Wärmepumpe (brutto, €)</label>
              <input type="number" className="w-full border rounded-lg px-2 py-1.5 bg-slate-50" value={form.investHP} readOnly />
              <p className="text-[11px] text-slate-500 mt-1">Kommt aus dem Heizungsrechner.</p>
            </div>

            {foerderForm.art === "wohn" ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-700">Wohngebäude-Optionen (vereinfacht)</p>
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input type="checkbox" checked={foerderForm.wohnKlimaBonus} onChange={(e) => updateFoerderField("wohnKlimaBonus", e.target.checked)} />
                  Klima-Geschwindigkeitsbonus
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input type="checkbox" checked={foerderForm.wohnEinkommensBonus} onChange={(e) => updateFoerderField("wohnEinkommensBonus", e.target.checked)} />
                  Einkommensbonus
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input type="checkbox" checked={foerderForm.wohnEffizienzBonus} onChange={(e) => updateFoerderField("wohnEffizienzBonus", e.target.checked)} />
                  Effizienzbonus
                </label>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-700">Nichtwohngebäude-Optionen (vereinfacht)</p>
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input type="checkbox" checked={foerderForm.nwgEffizienzBonus} onChange={(e) => updateFoerderField("nwgEffizienzBonus", e.target.checked)} />
                  Effizienzbonus
                </label>
              </div>
            )}

            <button type="submit" disabled={foerderLoading} className="mt-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-60">
              {foerderLoading ? "Berechne Förderung ..." : "Förderung berechnen"}
            </button>

            {foerderError && <p className="text-xs text-red-600 mt-2">{foerderError}</p>}
          </form>

          <div className="bg-white border rounded-xl p-4 shadow-sm text-sm">
            {!foerderResult && (
              <p className="text-slate-600">
                Nach der Berechnung kannst du den Zuschuss per Button in den Heizungsrechner übernehmen.
              </p>
            )}

            {foerderResult && (
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-slate-500">Förderquote</div>
                  <div className="text-lg font-semibold">
                    {foerderResult.foerderProzent.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Geschätzter Zuschuss</div>
                  <div className="text-lg font-semibold">{formatEuro(foerderResult.foerderEuro, 0)}</div>

                  <button
                    type="button"
                    className={
                      "w-full mt-2 px-4 py-2 rounded-lg text-sm font-medium " +
                      (subsidyApplied ? "bg-emerald-600 text-white" : "bg-blue-600 text-white hover:bg-blue-700")
                    }
                    onClick={() => {
                      setForm((prev) => ({ ...prev, subsidyHP: Math.round(foerderResult.foerderEuro) }));
                      setSubsidyApplied(true);
                      setTab("vergleich");
                    }}
                  >
                    {subsidyApplied ? "Zuschuss übernommen ✓" : "Zuschuss übernehmen"}
                  </button>

                  <p className="text-[11px] text-slate-500 mt-2">
                    Übernimmt den Zuschuss in „Förderung WP (Zuschuss, €)“ und springt zurück.
                  </p>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Verbleibende Investition nach Zuschuss</div>
                  <div className="text-lg font-semibold">{formatEuro(foerderResult.restInvest, 0)}</div>
                </div>

                <p className="text-[11px] text-slate-500">Alle Angaben ohne Gewähr.</p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
