import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Footer from './Footer';

describe('Footer', () => {
  it('links the brand back to the landing page', () => {
    render(<Footer />);

    expect(
      screen.getByRole('link', { name: 'Campus Rallye Admin' })
    ).toHaveAttribute('href', '/');
  });

  it('links to all public legal pages', () => {
    render(<Footer />);

    expect(screen.getByRole('link', { name: 'Impressum' })).toHaveAttribute(
      'href',
      '/impressum'
    );
    expect(
      screen.getByRole('link', { name: 'Datenschutzerklärung' })
    ).toHaveAttribute('href', '/datenschutz');
    expect(
      screen.getByRole('link', { name: 'Nutzungsordnung' })
    ).toHaveAttribute('href', '/nutzungsordnung');
  });
});
