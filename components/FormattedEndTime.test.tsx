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
    const html = renderToStaticMarkup(<FormattedEndTime value="18:00:00" />);
    expect(html).toContain('18:00 Uhr');
    expect(html).not.toContain('Kein Ende geplant');
  });

  it('renders a local time without date or timezone conversion', () => {
    render(<FormattedEndTime value="00:30:00" />);
    expect(screen.getByText('00:30 Uhr')).toBeInTheDocument();
  });
});
