import Link from "next/link";

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <section className="mb-10">
        <h1 className="text-3xl md:text-4xl font-semibold mb-4">
          Heizungs-Vergleich mit CO₂-Kosten &amp; Förderrechner
        </h1>
        <p className="text-slate-700 mb-4 max-w-2xl">
          Dieses Tool ermöglicht einen langfristigen Vergleich zwischen einer fossilen Heizung
          und einer Wärmepumpe aus Vermietersicht – inklusive CO₂-Kosten nach Stufenmodell
          (CO₂KostAufG) und einem vereinfachten Förderrechner.
        </p>
        <p className="text-slate-700 mb-6 max-w-2xl">
          Die Rechenlogik läuft vollständig serverseitig. Nutzer:innen sehen nur Eingaben und
          Ergebnisse, nicht den zugrunde liegenden Quellcode.
        </p>
        <Link
          href="/tool"
          className="inline-flex items-center rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700"
        >
          Zum Rechner
        </Link>
      </section>

      <section className="grid md:grid-cols-3 gap-6 mb-10 text-sm">
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold mb-2 text-slate-900">CO₂-Kosten &amp; Stufenmodell</h2>
          <p className="text-slate-700">
            Automatische Berechnung spezifischer Emissionen in kg CO₂/m²a und Vermieteranteil
            gemäß CO₂KostAufG-Stufenmodell.
          </p>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold mb-2 text-slate-900">Wirtschaftlichkeit Wärmepumpe</h2>
          <p className="text-slate-700">
            Vergleich von Investitions-, Energie- und Wartungskosten über einen frei wählbaren
            Zeitraum sowie einfache Amortisationszeit.
          </p>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold mb-2 text-slate-900">Förderrechner integriert</h2>
          <p className="text-slate-700">
            Vereinfachte Abbildung von Förderprogrammen (z. B. Wohngebäude und KfW 522 für
            Nichtwohngebäude) mit Zuschuss- und Kostenobergrenzen.
          </p>
        </div>
      </section>

      <section className="bg-white border rounded-xl p-4 md:p-6 shadow-sm text-sm">
        <h2 className="font-semibold mb-2 text-slate-900">Hinweis</h2>
        <p className="text-slate-700">
          Dieses Tool dient als Orientierungshilfe und ersetzt keine individuelle Energieberatung,
          Rechtsberatung oder verbindliche Förderzusage. Maßgeblich sind stets die aktuellen
          gesetzlichen Regelungen und Richtlinien der Förderstellen (z. B. KfW/BAFA).
        </p>
      </section>
    </div>
  );
}
