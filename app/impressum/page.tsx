import Link from 'next/link';
import LegalPage from '@/components/LegalPage';

export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum">
      <section>
        <h2 className="text-base font-semibold text-foreground">Herausgeber</h2>
        <address className="mt-2 not-italic">
          Duale Hochschule Baden-Württemberg Lörrach
          <br />
          Baden-Wuerttemberg Cooperative State University Lörrach
          <br />
          Hangstraße 46-50
          <br />
          D-79539 Lörrach
        </address>
        <p className="mt-2">
          Telefon:{' '}
          <a
            className="underline-offset-4 hover:underline"
            href="tel:+49762120710"
          >
            +49 7621 2071 0
          </a>
          <br />
          E-Mail:{' '}
          <a
            className="underline-offset-4 hover:underline"
            href="mailto:info@dhbw-loerrach.de"
          >
            info@dhbw-loerrach.de
          </a>
          <br />
          Webseite:{' '}
          <a
            className="underline-offset-4 hover:underline"
            href="https://dhbw-loerrach.de"
          >
            https://www.dhbw-loerrach.de
          </a>
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          Gesetzliche Vertretung
        </h2>
        <p className="mt-2">
          Die Duale Hochschule Baden-Württemberg ist eine rechtsfähige
          Körperschaft des öffentlichen Rechts. Sie wird gesetzlich vertreten
          durch die Präsidentin der Dualen Hochschule Baden-Württemberg, Frau
          Prof. Dr. Martina Klärle.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          Steuerliche Angaben
        </h2>
        <p className="mt-2">
          Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:
          DE287664832
          <br />
          Wirtschafts-Identifikationsnummer (W-IdNr.): DE287664832-00001
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          Zuständige Aufsichtsbehörde
        </h2>
        <address className="mt-2 not-italic">
          Ministerium für Wissenschaft, Forschung und Kunst des Landes
          Baden-Württemberg
          <br />
          Königstraße 46
          <br />
          D-70173 Stuttgart
        </address>
        <p className="mt-2">
          Telefon: +49 711 279 0
          <br />
          Telefax: +49 711 279 3081
          <br />
          E-Mail:{' '}
          <a
            className="underline-offset-4 hover:underline"
            href="mailto:poststelle@mwk.bwl.de"
          >
            poststelle@mwk.bwl.de
          </a>
          <br />
          Website:{' '}
          <a
            className="underline-offset-4 hover:underline"
            href="https://www.mwk.baden-wuerttemberg.de"
          >
            mwk.baden-wuerttemberg.de
          </a>
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          Fachliche und technische Verantwortung
        </h2>
        <p className="mt-2">
          Inhaltlich verantwortlich sind die jeweils zuständigen Personen der
          Studiengänge, Studienrichtungen, Studienzentren oder
          Organisationseinheiten. Hinweise zur Campus Rallye Admin App können
          per E-Mail an{' '}
          <a
            className="underline-offset-4 hover:underline"
            href="mailto:apps@dhbw-loerrach.de"
          >
            apps@dhbw-loerrach.de
          </a>{' '}
          gerichtet werden.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">Datenschutz</h2>
        <p className="mt-2">
          Hinweise zur Verarbeitung personenbezogener Daten finden Sie in der{' '}
          <Link
            href="/datenschutz"
            className="underline-offset-4 hover:underline"
          >
            Datenschutzerklärung
          </Link>
          .
        </p>
      </section>
    </LegalPage>
  );
}
