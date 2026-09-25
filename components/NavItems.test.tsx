import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NavItems from './NavItems';

const { mockUsePathname, mockUseSearchParams } = vi.hoisted(() => ({
  mockUsePathname: vi.fn(),
  mockUseSearchParams: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: mockUsePathname,
  useSearchParams: mockUseSearchParams,
}));

const routes = [
  { href: '/rallyes', label: 'Rallyes' },
  { href: '/questions', label: 'Fragenkatalog' },
];

function renderAt(pathname: string, query = '') {
  mockUsePathname.mockReturnValue(pathname);
  mockUseSearchParams.mockReturnValue(new URLSearchParams(query));
  render(<NavItems routes={routes} />);
}

describe('NavItems', () => {
  it.each([
    ['/questions/7', 'returnTo=%2Frallyes%2F5'],
    ['/questions/new', 'rallyeId=5'],
    ['/questions/new', 'returnTo=%2Frallyes%2F5'],
    ['/questions/7', 'returnTo=%2Frallyes%2Fnew'],
  ])('marks Rallyes at %s with %s', (path, query) => {
    renderAt(path, query);
    expect(screen.getByRole('link', { name: 'Rallyes' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(
      screen.getByRole('link', { name: 'Fragenkatalog' })
    ).not.toHaveAttribute('aria-current');
  });

  it.each(['/questions', '/questions/7'])(
    'keeps the question catalog active at %s without rallye context',
    (path) => {
      renderAt(path);
      expect(
        screen.getByRole('link', { name: 'Fragenkatalog' })
      ).toHaveAttribute('aria-current', 'page');
    }
  );
});
