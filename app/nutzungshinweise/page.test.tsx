import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NutzungshinweisePage from './page';

describe('NutzungshinweisePage', () => {
  it('renders the usage guidance for authorized internal use', () => {
    render(<NutzungshinweisePage />);

    expect(
      screen.getByRole('heading', { name: 'Nutzungshinweise', level: 1 })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/ausschließlich berechtigten Personen/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/personenbezogene Daten nur verarbeitet werden/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Nutzerinnen und Nutzer verantwortlich/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Insbesondere rechtswidrige/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Datenschutzerklärung' })
    ).toHaveAttribute('href', '/datenschutz');
    expect(
      screen.getByRole('link', { name: 'apps@dhbw-loerrach.de' })
    ).toHaveAttribute('href', 'mailto:apps@dhbw-loerrach.de');
  });
});
