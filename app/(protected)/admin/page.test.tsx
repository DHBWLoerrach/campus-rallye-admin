import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminPage from './page';

const { mockRequireAdmin, mockRedirect } = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockRedirect: vi.fn(),
}));

vi.mock('@/lib/require-profile', () => ({
  requireAdmin: mockRequireAdmin,
}));

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

describe('AdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('links to the three admin areas for admins', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });
    render(await AdminPage());

    expect(screen.getByRole('link', { name: /Bereiche/ })).toHaveAttribute(
      'href',
      '/admin/departments'
    );
    expect(screen.getByRole('link', { name: /Standorte/ })).toHaveAttribute(
      'href',
      '/admin/locations'
    );
    expect(screen.getByRole('link', { name: /Nutzer/ })).toHaveAttribute(
      'href',
      '/admin/users'
    );
  });

  it('redirects non-admins to /rallyes', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Denied'));
    await AdminPage();
    expect(mockRedirect).toHaveBeenCalledWith('/rallyes');
  });
});
