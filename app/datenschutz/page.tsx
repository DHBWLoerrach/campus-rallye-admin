import LegalPage from '@/components/LegalPage';

export default function DatenschutzPage() {
  return (
    <LegalPage title="Datenschutzerklärung">
      <p>
        <strong className="font-semibold text-foreground">
          Stand: 15. Mai 2026
        </strong>
      </p>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          1. Zweck und Anwendungsbereich
        </h2>
        <p className="mt-2">
          Die Campus Rallye Admin App ist eine webbasierte Verwaltungsanwendung
          der DHBW Lörrach zur Organisation, Durchführung und Nachbereitung von
          Campus Rallyes. Sie dient insbesondere der Verwaltung von
          Rallye-Inhalten, Aufgaben, Antworten, Uploads, Informationen zu Teams
          und Ergebnissen.
        </p>
        <p className="mt-2">
          Die Admin App ist ausschließlich für berechtigte Mitarbeitende der
          DHBW Lörrach bestimmt. Studierende, externe Teilnehmende und Teams
          erhalten keinen Zugriff auf diese Verwaltungsanwendung. Sie können
          jedoch über eine begleitende mobile Rallye-App Daten eingeben, die in
          der Admin App für berechtigte Mitarbeitende sichtbar werden.
        </p>
        <p className="mt-2">
          Für die begleitende mobile Rallye-App gelten ergänzende
          Datenschutzhinweise, die den Teilnehmenden vor oder bei Nutzung der
          App bereitgestellt werden.
        </p>
        <p className="mt-2">
          Diese Datenschutzerklärung ergänzt die allgemeine{' '}
          <a
            className="underline-offset-4 hover:underline"
            href="https://www.dhbw.de/datenschutz"
          >
            Datenschutzerklärung der Dualen Hochschule Baden-Württemberg
          </a>{' '}
          für die hier beschriebene Anwendung.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          2. Betroffene Personengruppen
        </h2>
        <p className="mt-2">
          Direkt betroffen sind berechtigte Mitarbeitende, die die Campus Rallye
          Admin App dienstlich nutzen. Von ihnen werden insbesondere
          Authentifizierungs-, Berechtigungs-, Profil- und technische Logdaten
          verarbeitet.
        </p>
        <p className="mt-2">
          Die in der Admin App sichtbaren Rallye-Daten Studierender oder
          Rallye-Teilnehmender sind grundsätzlich nicht auf einzelne Personen
          bezogen. Teamnamen werden in der Regel von der mobilen Rallye-App
          vergeben, ohne personenidentifizierende Klarnamen zu enthalten;
          Antworten zu Wissensfragen sind sachbezogen. Upload-Aufgaben sind so
          konzipiert, dass keine Fotos mit erkennbaren Personen entstehen
          sollen.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          3. Verantwortliche Stelle und lokale Zuständigkeit
        </h2>
        <p className="mt-2">
          Verantwortliche im Sinne von Art. 4 Nr. 7 DSGVO ist die Duale
          Hochschule Baden-Württemberg, gesetzlich vertreten durch die
          Präsidentin der Dualen Hochschule Baden-Württemberg, Prof. Dr. Martina
          Klärle, Friedrichstraße 14, 70174 Stuttgart, Telefon +49 711 320660-0,
          Fax +49 711 320660-66, E-Mail{' '}
          <a
            className="underline-offset-4 hover:underline"
            href="mailto:poststelle@dhbw.de"
          >
            poststelle@dhbw.de
          </a>
          .
        </p>
        <p className="mt-2">
          Die DHBW Lörrach, Hangstraße 46–50, 79539 Lörrach, ist organisatorisch
          für Betrieb, fachliche Betreuung und lokale Nutzung der Campus Rallye
          Admin App zuständig. Ansprechperson am Standort für Betrieb und
          Administration der Anwendung ist Prof. Dr. Erik Behrends. Die DHBW
          Lörrach und die Ansprechperson am Standort werden dadurch nicht zu
          eigenständigen datenschutzrechtlich Verantwortlichen.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          4. Datenschutzbeauftragter
        </h2>
        <p className="mt-2">
          Den zentralen Datenschutzbeauftragten der DHBW erreichen Sie unter der
          E-Mail-Adresse{' '}
          <a
            className="underline-offset-4 hover:underline"
            href="mailto:datenschutz@dhbw.de"
          >
            datenschutz@dhbw.de
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          5. Aufruf der Anwendung und technische Logdaten
        </h2>
        <p className="mt-2">
          Beim Aufruf der Anwendung können technisch erforderliche Daten
          verarbeitet werden, insbesondere IP-Adresse, Datum und Uhrzeit der
          Anfrage, aufgerufene Seite oder Funktion, HTTP-Statuscode, übertragene
          Datenmenge, verweisende Website, Browser- und
          Betriebssysteminformationen. Diese Daten dienen dem technischen
          Betrieb, der Fehleranalyse, der Missbrauchsprävention und der
          IT-Sicherheit.
        </p>
        <p className="mt-2">
          Technische Logdaten werden spätestens nach 30 Tagen gelöscht oder
          anonymisiert, soweit keine längere Speicherung zur Aufklärung
          sicherheitsrelevanter Ereignisse erforderlich ist.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          6. Authentifizierung und Berechtigungsprüfung
        </h2>
        <p className="mt-2">
          Die Anmeldung erfolgt über den DHBW-Account bzw. über das zentrale
          Authentifizierungssystem Keycloak und eine vorgeschaltete
          Login-Infrastruktur. Die App verarbeitet die zur Anmeldung und
          Berechtigungsprüfung erforderlichen Login- und Berechtigungsdaten,
          insbesondere eine technische Nutzerkennung, die dienstliche
          E-Mail-Adresse oder Benutzerkennung sowie Berechtigungsinformationen.
        </p>
        <p className="mt-2">
          Die App speichert keine DHBW-Passwörter. Der Zugriff auf die Admin App
          wird nur gewährt, wenn die erforderliche Berechtigung vorliegt. Nicht
          berechtigte Personen werden abgewiesen.
        </p>
        <p className="mt-2">
          Die Bereitstellung der Authentifizierungs- und Berechtigungsdaten ist
          Voraussetzung für die Nutzung der Admin App. Ohne diese Daten ist kein
          Zugriff möglich.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          7. Nutzer- und Profildaten der Mitarbeitenden
        </h2>
        <p className="mt-2">
          Zur Berechtigungsverwaltung wird auf dem Server der DHBW Lörrach eine
          lokale Datenbank für berechtigte Nutzerinnen und Nutzer geführt. Dort
          werden eine technische Nutzerkennung, die E-Mail-Adresse, ein
          Admin-Kennzeichen und der Zeitpunkt der erstmaligen Registrierung
          gespeichert.
        </p>
        <p className="mt-2">
          Nach Ausscheiden aus der DHBW oder Wegfall der Berechtigung werden
          diese Daten gelöscht.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          8. Rallye-, Fragen-, Team-, Upload- und Ergebnisdaten
        </h2>
        <p className="mt-2">
          Die App verarbeitet fachliche Verwaltungsdaten wie Rallyes,
          Organisationen, Abteilungen, Fragen, Antwortmöglichkeiten und
          Punktewerte.
        </p>
        <p className="mt-2">
          Für die Durchführung und Auswertung verarbeitet die App außerdem
          Teamnamen, Antworten, Uploads, Punkte, Bearbeitungszeiten, Ergebnisse
          und Rankings. Teamnamen werden in der Regel von der mobilen Rallye-App
          vergeben, ohne personenidentifizierende Klarnamen zu enthalten;
          Antworten zu Wissensfragen sind sachbezogen. Ein Personenbezug zu
          einzelnen Teilnehmenden ist dadurch grundsätzlich nicht vorgesehen.
        </p>
        <p className="mt-2">
          Fragebilder werden im Dateispeicher der Anwendung gespeichert und für
          die Auslieferung der Frageinhalte öffentlich bereitgestellt.
        </p>
        <p className="mt-2">
          Upload-Aufgaben sind so konzipiert, dass keine Fotos mit erkennbaren
          Personen entstehen sollen. Uploads werden im geschützten Dateispeicher
          gespeichert und sind nur für berechtigte Nutzerinnen und Nutzer der
          Admin App über zeitlich begrenzte Zugriffsmöglichkeiten sichtbar.
          Sollten künftig Upload-Aufgaben mit erkennbaren Personen vorgesehen
          werden, wird vorab eine geeignete Rechtsgrundlage festgelegt und diese
          Datenschutzerklärung entsprechend aktualisiert.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          9. Cookies und lokale Einstellungen
        </h2>
        <p className="mt-2">
          Die Anwendung verwendet technisch notwendige Cookies des Login-Systems
          und der vorgeschalteten Infrastruktur. Die von der Admin App selbst
          gesetzten Cookies enthalten keine fachlichen Inhaltsdaten, sondern
          lediglich technische Markierungswerte. Cookies des Login-Systems und
          der vorgeschalteten Infrastruktur dienen der Authentifizierung und
          Sitzungsverwaltung.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          10. Eingesetzte Systeme und Empfänger
        </h2>
        <p className="mt-2">
          Die Webanwendung selbst wird auf Servern der DHBW Lörrach betrieben.
          Für fachliche Rallye-Daten wird Supabase Cloud eingesetzt; die Daten
          werden in der EU-Region Frankfurt am Main verarbeitet. Die in Supabase
          gespeicherten fachlichen Rallye-Daten sind nach der Konzeption der
          Anwendung grundsätzlich nicht auf einzelne Personen bezogen. Die
          Authentifizierung erfolgt über Keycloak.
        </p>
        <p className="mt-2">
          Empfänger personenbezogener Daten sind ausschließlich berechtigte
          Nutzerinnen und Nutzer der Admin App, zentrale IT- und
          Authentifizierungssysteme der DHBW sowie für Betrieb und Wartung
          zuständige Stellen der DHBW Lörrach.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          11. Drittlandübermittlung, Tracking und Profiling
        </h2>
        <p className="mt-2">
          Eine reguläre Übermittlung personenbezogener Daten in Staaten
          außerhalb der EU oder des EWR findet nicht statt. Soweit im Einzelfall
          ein Zugriff oder eine Übermittlung in Drittstaaten nicht
          ausgeschlossen werden kann, erfolgt dies nur auf Grundlage geeigneter
          datenschutzrechtlicher Garantien nach Maßgabe der DSGVO.
        </p>
        <p className="mt-2">
          Externe Analyse-, Werbe- oder Trackingdienste werden nicht eingesetzt.
          Eine automatisierte Entscheidungsfindung mit rechtlicher Wirkung sowie
          ein Profiling zu Werbe- oder Marketingzwecken finden nicht statt.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          12. Rechtsgrundlagen der Verarbeitung
        </h2>
        <p className="mt-2">
          Die Verarbeitung erfolgt zur Wahrnehmung der Aufgaben der DHBW im
          Hochschulkontext auf Grundlage von Art. 6 Abs. 1 lit. e DSGVO in
          Verbindung mit den einschlägigen hochschul- und datenschutzrechtlichen
          Vorschriften des Landes Baden-Württemberg.
        </p>
        <p className="mt-2">
          Soweit künftig Uploads oder andere Inhalte erkennbare Personen
          betreffen, wird vor der Nutzung entsprechender Aufgaben eine geeignete
          Rechtsgrundlage festgelegt.
        </p>
      </section>
      <section>
        <h2 className="text-base font-semibold text-foreground">
          13. Löschung und Speicherfristen
        </h2>
        <p className="mt-2">
          Personenbezogene Daten werden gelöscht oder anonymisiert, sobald sie
          für die genannten Zwecke nicht mehr erforderlich sind und keine
          gesetzlichen, organisatorischen oder sicherheitsbezogenen Gründe für
          eine weitere Speicherung bestehen.
        </p>
        <p className="mt-2">
          Technische Logdaten werden spätestens nach 30 Tagen gelöscht oder
          anonymisiert (siehe Abschnitt 5).
        </p>
        <p className="mt-2">
          Nutzer- und Profildaten berechtigter Mitarbeitender werden gelöscht,
          wenn die Zugriffsberechtigung entfällt und keine Gründe für eine
          weitere Speicherung bestehen.
        </p>
        <p className="mt-2">
          Rallye-, Team-, Antwort-, Ergebnis- und Upload-Daten werden gelöscht,
          sobald sie für Durchführung, Bewertung, Präsentation und Nachbereitung
          der jeweiligen Rallye nicht mehr erforderlich sind. Die Löschung
          erfolgt durch die Administration der Anwendung.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          14. Rechte betroffener Personen
        </h2>
        <p className="mt-2">
          Betroffene Personen haben nach Maßgabe der gesetzlichen
          Voraussetzungen insbesondere Rechte auf Auskunft nach Art. 15 DSGVO,
          Berichtigung nach Art. 16 DSGVO, Löschung nach Art. 17 DSGVO,
          Einschränkung der Verarbeitung nach Art. 18 DSGVO, Widerspruch nach
          Art. 21 DSGVO und Datenübertragbarkeit nach Art. 20 DSGVO. Sofern eine
          Verarbeitung auf einer Einwilligung beruht, kann diese Einwilligung
          mit Wirkung für die Zukunft widerrufen werden.
        </p>
        <p className="mt-2">
          Zur Ausübung dieser Rechte können sich betroffene Personen an{' '}
          <a
            className="underline-offset-4 hover:underline"
            href="mailto:datenschutz@dhbw.de"
          >
            datenschutz@dhbw.de
          </a>{' '}
          oder an die in Abschnitt 3 genannte verantwortliche Stelle wenden.
        </p>
        <p className="mt-2">
          Zudem besteht das Recht, sich bei einer Datenschutzaufsichtsbehörde
          über die Verarbeitung personenbezogener Daten zu beschweren. Zuständig
          ist insbesondere der Landesbeauftragte für den Datenschutz und die
          Informationsfreiheit Baden-Württemberg, Heilbronner Straße 35, 70191
          Stuttgart, E-Mail{' '}
          <a
            className="underline-offset-4 hover:underline"
            href="mailto:poststelle@lfdi.bwl.de"
          >
            poststelle@lfdi.bwl.de
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          15. Änderungen dieser Datenschutzerklärung
        </h2>
        <p className="mt-2">
          Diese Datenschutzerklärung wird angepasst, wenn sich technische,
          organisatorische oder rechtliche Rahmenbedingungen ändern,
          insbesondere bei Änderungen an Authentifizierung, Hosting,
          Speichersystemen, Upload-Funktionen, Auswertungen, Empfängerkategorien
          oder Speicherfristen.
        </p>
      </section>
    </LegalPage>
  );
}
