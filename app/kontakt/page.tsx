export default function KontaktPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-10 text-sm">
      <h1 className="text-2xl font-semibold mb-4">Kontakt</h1>
      <p className="text-slate-700 mb-4">
        Wenn Sie Feedback zum Tool haben oder eine Zusammenarbeit im Bereich
        Heizungsmodernisierung und CO₂-Kostenabschätzung wünschen, können Sie
        sich gerne melden.
      </p>
      <div className="bg-white border rounded-xl p-4 shadow-sm space-y-2">
        <p><span className="font-medium">E-Mail:</span> <span>example@example.com</span></p>
        <p className="text-xs text-slate-500">
          (Diese Seite ist ein technisches Beispiel. Bitte E-Mail-Adresse im Code anpassen.)
        </p>
      </div>
    </div>
  );
}
