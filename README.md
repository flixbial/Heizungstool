# Heizungs-Vergleich mit CO₂-Kosten & Förderrechner (Next.js)

Dieses Repository enthält eine Next.js-App, die einen Heizungs-Vergleich
(fossile Heizung vs. Wärmepumpe) aus Vermietersicht sowie einen vereinfachten
Förderrechner abbildet. Die Rechenlogik liegt vollständig serverseitig in
`lib/calc.ts` und `lib/foerder.ts`, sodass Nutzer:innen den Quellcode der
eigentlichen Berechnungen nicht im Browser einsehen können.

## Features

- Vergleich fossil vs. Wärmepumpe über einen frei wählbaren Zeitraum
- CO₂-Preisszenarien (sehr niedrig bis sehr hoch)
- Emissionsfaktoren und CO₂-Kostenzuordnung nach Stufenmodell (CO₂KostAufG)
- Kumulierte Vermieterkosten & einfache Amortisationszeit
- Vereinfachter Förderrechner für
  - Wohngebäude (Heizungs-Kostenobergrenze nach Wohneinheiten, Boni)
  - Nichtwohngebäude (KfW 522 – Förderhöchstbetrag nach m², Effizienzbonus)
- Grafische Auswertung mit Recharts (Linien- und Balkendiagramm)
- Moderne UI mit Tailwind CSS und Tabs (Rechner / Förderrechner)
- Landingpage, FAQ und Kontaktseite als Grundlage für eine Produkt-Website

## Entwicklung

```bash
npm install
npm run dev
```

Danach im Browser:

- http://localhost:3000          → Landingpage
- http://localhost:3000/tool     → Rechner & Förderrechner
- http://localhost:3000/faq      → FAQ
- http://localhost:3000/kontakt  → Kontakt

## Deployment

1. Repository auf GitHub anlegen und Code pushen
2. Projekt in Vercel importieren (Framework: Next.js, App Router)
3. Domain konfigurieren (optional)

## Hinweis

Dieses Tool dient als überschlägige Orientierungshilfe und ersetzt keine
Energieberatung, Rechtsberatung oder verbindliche Förderzusage. Änderungen
an gesetzlichen Rahmenbedingungen, CO₂-Preisen und Förderprogrammen sind
jederzeit möglich.
