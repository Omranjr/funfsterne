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
        fill in the remaining bracketed fields below (Handelsregister,
        USt-IdNr — only if either actually applies to you) before this page
        goes live. Everything else on this page is filled in.
      </TodoNotice>

      <h2>Angaben gemäß § 5 TMG</h2>
      <p>
        Mohamed Gamal Elsayed Mahmoud
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
      <p>Mohamed Gamal Elsayed Mahmoud</p>

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
      <p>Mohamed Gamal Elsayed Mahmoud (Anschrift wie oben)</p>

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
