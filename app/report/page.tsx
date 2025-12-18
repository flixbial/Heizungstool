"use client";

import { useEffect, useMemo, useState } from "react";

type Role = "eigentuemer" | "vermieter" | "mieter";

type ReportPayload = {
  role: Role;
  createdAtISO: string;
  form: any;
  result: any;
};

function formatEuro(value: number, decimals = 0) {
  return (
    Number(value || 0).toLocaleString("de-DE", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) + " €"
  );
}

// ✅ Texte modular (leicht erweiterbar)
function getNarrative(role: Role, payload: ReportPayload) {
  const r = payload.result;
  const years = payload.form?.years ?? 20;

  const pick = () => {
    if (role === "vermieter")
      return { label: "Vermieter", savings: r.savingsLandlord, payback: r.paybackLandlord, totalFossil: r.totalLandlordFossil };
    if (role === "mieter")
      return { label: "Mieter", savings: r.savingsTenant, payback: null, totalFossil: r.totalTenantFossil };
    return { label: "Eigentümer (Selbstnutzer)", savings: r.savingsOwner, payback: r.paybackOwner, totalFossil: r.totalOwnerFossil };
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
    role !== "mieter" && (payload.result.extraInvest ?? 0) > 0
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

  return { headline, intro: introByRole[role], drivers, paybackText, nextSteps: nextStepsByRole[role] };
}

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

// ✅ Grafik 1: Kumulierte Kosten (Linien) als SVG
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

// ✅ Grafik 2: Gesamtkosten als SVG-Balken
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

        <text x={x1} y={yBase + 18} fontSize="12" fill="#334155" textAnchor="middle">
          {labelFossil}
        </text>
        <text x={x2} y={yBase + 18} fontSize="12" fill="#334155" textAnchor="middle">
          {labelHP}
        </text>

        <text x={x1} y={yBase - fH - 8} fontSize="12" fill="#0f172a" textAnchor="middle" fontWeight="700">
          {Math.round(Number(fossil || 0)).toLocaleString("de-DE")} €
        </text>
        <text x={x2} y={yBase - hH - 8} fontSize="12" fill="#0f172a" textAnchor="middle" fontWeight="700">
          {Math.round(Number(hp || 0)).toLocaleString("de-DE")} €
        </text>

        <text x={pad} y={pad - 8} fontSize="11" fill="#64748b">
          max ≈ {Math.round(maxY).toLocaleString("de-DE")} €
        </text>
      </svg>
    </div>
  );
}

export default function ReportPage() {
  const [payload, setPayload] = useState<ReportPayload | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("heizungstool_report");
    if (raw) {
      try {
        setPayload(JSON.parse(raw));
      } catch {
        // ignore
      }
    }
    // ✅ automatisch Print-Dialog öffnen
    setTimeout(() => window.print(), 250);
  }, []);

  const narrative = useMemo(() => {
    if (!payload) return null;
    return getNarrative(payload.role, payload);
  }, [payload]);

  if (!payload) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <h1>Kein Bericht verfügbar</h1>
        <p>Bitte im Tool zuerst berechnen und dann „Bericht drucken“ klicken.</p>
      </div>
    );
  }

  const { role, createdAtISO, form, result } = payload;

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

  return (
    <div className="report">
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
        .report {
          max-width: 900px;
          margin: 0 auto;
          padding: 24px;
          font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          color: #0f172a;
        }
        .header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .logo {
          height: 56px;
          width: auto;
        }
        .muted {
          color: #64748b;
          font-size: 12px;
        }
        .title {
          font-size: 20px;
          font-weight: 700;
          margin: 0;
        }
        .kpis {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin: 16px 0;
        }
        .card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px;
        }
        .card h3 {
          margin: 0 0 6px 0;
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
        }
        .card .val {
          font-size: 18px;
          font-weight: 700;
        }
        .section {
          margin-top: 14px;
        }
        .section h2 {
          font-size: 14px;
          margin: 0 0 6px 0;
        }
        ul {
          margin: 6px 0 0 18px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        th,
        td {
          border-bottom: 1px solid #e2e8f0;
          padding: 6px 4px;
          text-align: left;
        }
        th {
          color: #64748b;
          font-weight: 700;
          width: 220px;
        }
      `}</style>

      <div className="header">
        <div>
          <img className="logo" src="/logo.png" alt="Firmenlogo" />
        </div>
        <div style={{ textAlign: "right" }}>
          <p className="title">Heizungs-Vergleich – Bericht</p>
          <div className="muted">
            Rolle:{" "}
            <b>{role === "vermieter" ? "Vermieter" : role === "mieter" ? "Mieter" : "Eigentümer"}</b>
            <br />
            Datum: {new Date(createdAtISO).toLocaleString("de-DE")}
          </div>
        </div>
      </div>

      {narrative && (
        <div className="card">
          <h2 style={{ margin: 0, fontSize: 14 }}>{narrative.headline}</h2>
          <p style={{ margin: "6px 0 0 0" }}>{narrative.intro}</p>
          <p className="muted" style={{ marginTop: 8 }}>
            {narrative.drivers}
          </p>
          {narrative.paybackText && (
            <p style={{ marginTop: 8 }}>
              <b>{narrative.paybackText}</b>
            </p>
          )}
          <div className="section">
            <h2>Nächste Schritte</h2>
            <ul>
              {narrative.nextSteps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="kpis">
        <div className="card">
          <h3>Gesamtkosten fossil</h3>
          <div className="val">{formatEuro(totals.fossil, 0)}</div>
        </div>
        <div className="card">
          <h3>Gesamtkosten Wärmepumpe</h3>
          <div className="val">{formatEuro(totals.wp, 0)}</div>
        </div>
        <div className="card">
          <h3>Vorteil/Nachteil WP</h3>
          <div className="val">{formatEuro(totals.savings, 0)}</div>
          <div className="muted">(positiv = Vorteil)</div>
        </div>
      </div>

      {/* ✅ 2 druckstabile Grafiken */}
      <MiniCostChart seriesFossil={series.fossil} seriesHP={series.hp} />
      <MiniTotalBarChart fossil={totals.fossil} hp={totals.wp} />

      <div className="section">
        <h2>Grundannahmen</h2>
        <table>
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

        <p className="muted" style={{ marginTop: 10 }}>
          Hinweis: Vereinfachtes Modell. Alle Angaben ohne Gewähr; maßgeblich sind aktuelle Richtlinien, Verträge und reale Anlagenwerte.
        </p>
      </div>

      <div className="no-print" style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <button
          onClick={() => window.print()}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            background: "#0b5ed7",
            color: "white",
            fontWeight: 600,
          }}
        >
          Drucken
        </button>
        <button
          onClick={() => history.back()}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            background: "white",
            fontWeight: 600,
          }}
        >
          Zurück
        </button>
      </div>
    </div>
  );
}
