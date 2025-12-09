export default function FAQPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 text-sm">
      <h1 className="text-2xl font-semibold mb-4">Häufige Fragen (FAQ)</h1>

      <div className="space-y-6">
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold mb-1">Welche Daten muss ich eingeben?</h2>
          <p className="text-slate-700">
            Zentrale Eingaben sind der Heizwärmebedarf oder Energieverbrauch des Gebäudes,
            die Gebäudefläche, der Betrachtungszeitraum, Energiepreise sowie Investitionskosten
            für die fossile Heizung und die Wärmepumpe.
          </p>
        </div>

        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold mb-1">Woher stammen die CO₂-Preisszenarien?</h2>
          <p className="text-slate-700">
            Die CO₂-Preisszenarien basieren auf angenommenen Pfaden (sehr niedrig bis sehr hoch),
            die im Tool hinterlegt sind. Sie können an eigene Annahmen angepasst werden.
          </p>
        </div>

        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold mb-1">Ist das eine rechtsverbindliche Berechnung?</h2>
          <p className="text-slate-700">
            Nein. Die Ergebnisse sind eine überschlägige Orientierung. Für verbindliche Aussagen
            sollten Sie eine Energieberatung, Rechtsberatung oder die Förderstelle selbst konsultieren.
          </p>
        </div>
      </div>
    </div>
  );
}
