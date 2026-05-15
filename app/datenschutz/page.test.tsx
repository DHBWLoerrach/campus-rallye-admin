import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DatenschutzPage from './page';

describe('DatenschutzPage', () => {
  it('covers app-specific data processing from the codebase', () => {
    render(<DatenschutzPage />);

    expect(
      screen.getByRole('heading', { name: 'Datenschutzerklärung', level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByText(/Stand: 15\. Mai 2026/)).toBeInTheDocument();
    expect(
      screen.getAllByText(/technische Nutzerkennung/).length
    ).toBeGreaterThan(0);
    expect(
      screen.queryByText(/Keycloak-ID bzw\. UUID/)
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/ausschließlich für berechtigte Mitarbeitende/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/zur Anmeldung und Berechtigungsprüfung/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Bereitstellung der Authentifizierungs- und Berechtigungsdaten/
      )
    ).toBeInTheDocument();
    expect(screen.getAllByText(/datenschutz@dhbw\.de/).length).toBeGreaterThan(
      0
    );
    expect(
      screen.queryByText(/Prof\. Dr\. Tobias Straub/)
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Prof\. Dr\. Erik Behrends/)).toBeInTheDocument();
    expect(
      screen.getByText(/keine personenbezogenen Inhaltsdaten/)
    ).toBeInTheDocument();
    expect(screen.queryByText(/nach aktuellem Stand/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/technisch notwendige Cookies des Login-Systems/)
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/spätestens nach 30 Tagen gelöscht oder anonymisiert/)
        .length
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(/Wahrnehmung der Aufgaben der DHBW/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/wird vor der Nutzung entsprechender Aufgaben/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/eigenen Servern der DHBW Lörrach/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Art\. 6 Abs\. 1 lit\. e DSGVO/)
    ).toBeInTheDocument();
    expect(screen.queryByText(/Rallye-Zugangscode/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/Rallye-, Fragen-, Team-, Upload- und Ergebnisdaten/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/fachliche Verwaltungsdaten wie Rallyes/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Teamnamen, Antworten, Uploads, Punkte/)
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Dateispeicher der Anwendung/).length
    ).toBeGreaterThan(0);
    expect(screen.getByText(/geschützten Dateispeicher/)).toBeInTheDocument();
    expect(
      screen.getByText(/zeitlich begrenzte Zugriffsmöglichkeiten/)
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/begleitenden mobilen Rallye-App/).length
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(/ergänzende Datenschutzhinweise/)
    ).toBeInTheDocument();
    expect(screen.queryByText(/OFFENER PUNKT:/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/Heilbronner Straße 35, 70191 Stuttgart/)
    ).toBeInTheDocument();
    expect(screen.queryByText(/rallye_team/)).not.toBeInTheDocument();
    expect(screen.queryByText(/team_questions/)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Entwurfsfassung zur internen Prüfung/)
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /Foto-Uploads werden spätestens 30 Tage nach Abschluss der Rallye/
      )
    ).toBeInTheDocument();
  });
});
