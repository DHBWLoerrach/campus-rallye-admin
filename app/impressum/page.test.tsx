import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ImpressumPage from './page';

describe('ImpressumPage', () => {
  it('renders the DHBW Loerrach publisher details', () => {
    render(<ImpressumPage />);

    expect(
      screen.getByRole('heading', { name: 'Impressum', level: 1 })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Duale Hochschule Baden-Württemberg Lörrach/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Hangstraße 46-50/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'info@dhbw-loerrach.de' })
    ).toHaveAttribute('href', 'mailto:info@dhbw-loerrach.de');
    expect(screen.getByText(/DE287664832/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'apps@dhbw-loerrach.de' })
    ).toHaveAttribute('href', 'mailto:apps@dhbw-loerrach.de');
    expect(
      screen.getByRole('link', { name: 'Datenschutzerklärung' })
    ).toHaveAttribute('href', '/datenschutz');
  });
});
