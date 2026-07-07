import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RallyeTabsNav from './RallyeTabsNav';

const { mockUsePathname } = vi.hoisted(() => ({ mockUsePathname: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: mockUsePathname }));

describe('RallyeTabsNav', () => {
  it('renders all four tabs with correct hrefs', () => {
    mockUsePathname.mockReturnValue('/rallyes/5');
    render(<RallyeTabsNav rallyeId={5} />);
    expect(screen.getByRole('link', { name: 'Fragen' })).toHaveAttribute(
      'href',
      '/rallyes/5'
    );
    expect(screen.getByRole('link', { name: 'Einstellungen' })).toHaveAttribute(
      'href',
      '/rallyes/5/settings'
    );
    expect(screen.getByRole('link', { name: 'Ergebnisse' })).toHaveAttribute(
      'href',
      '/rallyes/5/results'
    );
    expect(screen.getByRole('link', { name: 'Fotos' })).toHaveAttribute(
      'href',
      '/rallyes/5/uploads'
    );
  });

  it('marks the active tab via aria-current', () => {
    mockUsePathname.mockReturnValue('/rallyes/5/results');
    render(<RallyeTabsNav rallyeId={5} />);
    expect(screen.getByRole('link', { name: 'Ergebnisse' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('link', { name: 'Fragen' })).not.toHaveAttribute(
      'aria-current'
    );
  });
});
