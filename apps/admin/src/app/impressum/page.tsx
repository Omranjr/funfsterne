import type { Metadata } from "next";
import { LegalPageShell, TodoNotice } from "@/components/legal-page-shell";

export const metadata: Metadata = {
  title: "Impressum | Fünf Sterne Friseur",
  description: "Legal notice for Fünf Sterne Friseur, per §5 TMG.",
};

export default function ImpressumPage() {
  return (
    <LegalPageShell title="Impressum" updated="29 July 2026">
      <TodoNotice>
        fill in the remaining bracketed fields below (legal name — waiting on
        whether this should be the shop owner or the developer — Vertretung,
        Handelsregister, USt-IdNr) with your real business details. This page
        is a legal requirement under German law (§5 TMG) for any commercial
        app or website operated from Germany — it must be accurate before
        going live.
      </TodoNotice>

      <h2>Angaben gemäß § 5 TMG</h2>
      <p>
        [Vollständiger Name des Unternehmens / Inhabers]
        <br />
        Frauenstraße 5
        <br />
        47574 Goch
        <br />
        Deutschland
      </p>

      <h2>Kontakt</h2>
      <p>
        Telefon:{" "}
        <a href="tel:+4928234198333">+49 2823 4198333</a>
        <br />
        E-Mail:{" "}
        <a href="mailto:funfsternebymido@gmail.com">
          funfsternebymido@gmail.com
        </a>
      </p>

      <h2>Vertreten durch</h2>
      <p>[Name der vertretungsberechtigten Person, z. B. Geschäftsführer]</p>

      <h2>Registereintrag</h2>
      <p>
        [Falls im Handelsregister eingetragen: Registergericht und
        Registernummer. Für Einzelunternehmen ohne Eintragung kann dieser
        Abschnitt entfallen.]
      </p>

      <h2>Umsatzsteuer-ID</h2>
      <p>
        [Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz,
        falls vorhanden]
      </p>

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>
        [Name und Anschrift, sofern abweichend von oben]
      </p>

      <h2>EU-Streitschlichtung</h2>
      <p>
        Die Europäische Kommission stellt eine Plattform zur
        Online-Streitbeilegung (OS) bereit:{" "}
        <a
          href="https://ec.europa.eu/consumers/odr/"
          target="_blank"
          rel="noreferrer"
        >
          https://ec.europa.eu/consumers/odr/
        </a>
        . Unsere E-Mail-Adresse finden Sie oben unter Kontakt. Wir sind nicht
        verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen.
      </p>
    </LegalPageShell>
  );
}
