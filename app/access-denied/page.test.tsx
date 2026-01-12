import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AccessDeniedPage from './page';

describe('AccessDeniedPage', () => {
  it('offers logout and return links', () => {
    render(<AccessDeniedPage />);

    expect(screen.getByRole('link', { name: 'Abmelden' })).toHaveAttribute(
      'href',
      '/oauth2/sign_out'
    );
  });
});
