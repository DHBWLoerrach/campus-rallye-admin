import Link from 'next/link';
import LegalPage from '@/components/LegalPage';

export default function NutzungshinweisePage() {
  return (
    <LegalPage title="Nutzungshinweise">
      <p>
        Die Campus Rallye Admin App ist eine interne Verwaltungsanwendung der
        DHBW Lörrach. Die Nutzung ist ausschließlich berechtigten Personen und
        nur für dienstliche oder projektbezogene Zwecke gestattet.
      </p>

      <p>
        Angemeldete Sitzungen und Berechtigungen dürfen nicht an Dritte
        weitergegeben oder gemeinsam genutzt werden. Inhalte in Rallyes, Fragen,
        Antworten und Upload-Aufgaben sind so zu gestalten, dass
        personenbezogene Daten nur verarbeitet werden, soweit dies für die
        Durchführung der Campus Rallye erforderlich ist.
      </p>

      <p>
        Für eingestellte Texte, Bilder und sonstige Inhalte sind die Nutzerinnen
        und Nutzer verantwortlich. Es dürfen nur Inhalte eingestellt werden, für
        die die erforderlichen Nutzungs-, Urheber- und Persönlichkeitsrechte
        vorliegen. Insbesondere rechtswidrige, diskriminierende oder
        beleidigende Inhalte sind unzulässig.
      </p>

      <p>
        Informationen zur Verarbeitung personenbezogener Daten finden Sie in der{' '}
        <Link
          href="/datenschutz"
          className="underline-offset-4 hover:underline"
        >
          Datenschutzerklärung
        </Link>
        .
      </p>

      <p>
        Bei Fragen oder Hinweisen zur Anwendung wenden Sie sich bitte an{' '}
        <a
          className="underline-offset-4 hover:underline"
          href="mailto:apps@dhbw-loerrach.de"
        >
          apps@dhbw-loerrach.de
        </a>
        .
      </p>
    </LegalPage>
  );
}
