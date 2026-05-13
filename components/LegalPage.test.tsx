import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LegalPage from './LegalPage';

describe('LegalPage', () => {
  it('renders a placeholder legal page with consistent copy', () => {
    render(<LegalPage title="Impressum" />);

    expect(
      screen.getByRole('heading', { name: 'Impressum', level: 1 })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Die Inhalte dieser Seite werden später ergänzt.')
    ).toBeInTheDocument();
  });
});
