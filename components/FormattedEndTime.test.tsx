import { render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import FormattedEndTime from './FormattedEndTime';

describe('FormattedEndTime', () => {
  it('shows a neutral label when no end is planned', () => {
    render(<FormattedEndTime value={null} />);
    expect(screen.getByText('Kein Ende geplant')).toBeInTheDocument();
  });

  it('renders the planned end already during server rendering', () => {
    // Reproduces the flash: the server render must show the actual time, not
    // the empty-state label that a client-only snapshot would leave behind.
    const html = renderToStaticMarkup(
      <FormattedEndTime value="2026-07-09T16:00:00.000Z" />
    );
    // 16:00 UTC on 2026-07-09 is 18:00 in Europe/Berlin (CEST); the weekday
    // abbreviation is left out of the assertion as it varies by ICU version.
    expect(html).toMatch(/09\.07\.26 18:00 Uhr/);
    expect(html).not.toContain('Kein Ende geplant');
  });

  it('pins formatting to Europe/Berlin across the date boundary', () => {
    render(<FormattedEndTime value="2026-01-01T23:30:00.000Z" />);
    // 23:30 UTC on 2026-01-01 is 00:30 the next day in Europe/Berlin (CET).
    expect(screen.getByText(/02\.01\.26 00:30 Uhr/)).toBeInTheDocument();
  });
});
