# Heizungs-Vergleich & Förderrechner

Ein interaktives Web-Tool zum **wirtschaftlichen Vergleich von fossilen Heizsystemen und Wärmepumpen**  
– inkl. **Förderrechner**, **Zielgruppen-Perspektiven** (Eigentümer, Vermieter, Mieter) und **druckbarem Ergebnisbericht**.

---

## ✨ Funktionen

### 🔥 Heizungs-Vergleich
- Vergleich **Fossil vs. Wärmepumpe**
- Betrachtungszeitraum frei wählbar (z. B. 20 Jahre)
- Berücksichtigung von:
  - Investitionskosten
  - Energiekosten (ct/kWh)
  - Wartung
  - CO₂-Kosten (Szenarien)
  - Förderungen
- Grafische Auswertung:
  - Kumulierte Kosten (Linien-Diagramm)
  - Gesamtkosten (Balken-Diagramm)

### 🎯 Zielgruppen-Perspektiven
Das Ergebnis wird je nach Rolle unterschiedlich berechnet und erklärt:

- **Eigentümer (Selbstnutzer)**  
  → Gesamtkosten inkl. Investition, Betrieb & CO₂

- **Vermieter**  
  → Vermieterkosten inkl. Investition, Wartung & Vermieteranteil CO₂

- **Mieter**  
  → Laufende Kosten (Energie + Mieteranteil CO₂)

### 💶 Förderrechner
- Vereinfachte Abbildung der aktuellen Bundesförderung
- Zuschuss wird **direkt in den Heizungsvergleich übernommen**
- Klarer Button: **„Zuschuss übernehmen“**

### 🖨️ Druckbarer Bericht
- Ergebnisbericht als **Popup im selben Tab**
- Druck via **Browser (window.print)**
- Enthält:
  - Firmenlogo
  - Zusammenfassung & Handlungsempfehlung
  - Zielgruppenabhängige Texte
  - Zwei druckstabile SVG-Grafiken
- Keine Weitergabe von Quellcode an Anwender

---

## 🧠 Methodik (vereinfacht)
- Energiekosten in **ct/kWh**
- Wärmepumpen-Bewertung über **JAZ**
- CO₂-Preise über Szenarien (sehr niedrig → sehr hoch)
- Modell ist **vereinfachend** und dient der Orientierung

> ⚠️ Hinweis: Das Tool ersetzt keine individuelle Energieberatung oder Fachplanung.

---

## 🛠️ Technologie-Stack

- **Next.js 14 (App Router)**
- **TypeScript**
- **React**
- **Recharts** (nur im UI, nicht im Druckbericht)
- **Vercel** (Deployment)
- **SVG-basierte Charts** für druckstabile Berichte

---

## 🚀 Lokale Entwicklung

```bash
npm install
npm run dev
