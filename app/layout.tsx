import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Heizungs-Vergleich | Wärmepumpe vs. fossil",
  description: "CO₂-Kosten- und Förderrechner für Vermieter:innen",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen flex flex-col">
        <header className="border-b bg-white/80 backdrop-blur">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="font-semibold text-slate-900">
              Heizungs-Vergleich
            </Link>
            <nav className="flex gap-4 text-sm text-slate-600">
              <Link href="/tool" className="hover:text-slate-900">
                Rechner
              </Link>
              <Link href="/faq" className="hover:text-slate-900">
                FAQ
              </Link>
              <Link href="/kontakt" className="hover:text-slate-900">
                Kontakt
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">
          {children}
        </main>
        <footer className="border-t bg-white">
          <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-slate-500 flex justify-between">
            <span>© {new Date().getFullYear()} Heizungs-Vergleich</span>
            <span>Alle Angaben ohne Gewähr – ersetzt keine Energie- oder Rechtsberatung.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
