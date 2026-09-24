import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PendingApprovalPage from './page';

vi.mock('next/server', () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));

describe('PendingApprovalPage', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('lists every configured contact address as a mail link', async () => {
    process.env.ACCESS_REQUEST_EMAILS = ' a@example.test, ,b@example.test ';

    render(await PendingApprovalPage());

    expect(
      screen.getByRole('link', { name: 'a@example.test' })
    ).toHaveAttribute('href', 'mailto:a@example.test');
    expect(
      screen.getByRole('link', { name: 'b@example.test' })
    ).toHaveAttribute('href', 'mailto:b@example.test');
    const mailLinks = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.startsWith('mailto:'));
    expect(mailLinks).toHaveLength(2);
  });

  it('refers to the admin team when no contact address is configured', async () => {
    delete process.env.ACCESS_REQUEST_EMAILS;

    render(await PendingApprovalPage());

    expect(
      screen.getByText('Bitte wenden Sie sich dafür an das Admin-Team.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /@/ })).not.toBeInTheDocument();
  });

  it('offers to retry and to sign out', async () => {
    render(await PendingApprovalPage());

    expect(
      screen.getByRole('link', { name: 'Erneut versuchen' })
    ).toHaveAttribute('href', '/rallyes');
    expect(screen.getByRole('link', { name: 'Abmelden' })).toHaveAttribute(
      'href',
      '/sign-out'
    );
  });
});
