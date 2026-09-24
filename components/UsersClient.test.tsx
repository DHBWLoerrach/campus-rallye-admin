import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UsersClient from './UsersClient';
import type { LocalUser } from '@/lib/db/local-user';

const { mockSetUserApproval } = vi.hoisted(() => ({
  mockSetUserApproval: vi.fn(),
}));

vi.mock('@/actions/local-users', () => ({
  assignUserDepartment: vi.fn(),
  setUserApproval: mockSetUserApproval,
}));

function user(overrides: Partial<LocalUser> & { email: string }): LocalUser {
  return {
    user_id: overrides.email,
    registered_at: '2026-01-01T00:00:00.000Z',
    admin: false,
    approved: true,
    department_id: null,
    ...overrides,
  };
}

const departmentOptions = [
  { id: 7, name: 'HoKo/Marketing' },
  { id: 8, name: 'SZI' },
];

describe('UsersClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders one row per user with email', () => {
    render(
      <UsersClient
        users={[
          {
            user_id: 'u1',
            email: 'a@b.de',
            registered_at: '2026-01-01T00:00:00.000Z',
            admin: false,
            approved: true,
            department_id: 7,
          },
          {
            user_id: 'u2',
            email: 'b@b.de',
            registered_at: '2026-01-02T00:00:00.000Z',
            admin: true,
            approved: true,
            department_id: null,
          },
        ]}
        departmentOptions={departmentOptions}
      />
    );
    expect(screen.getByText('a@b.de')).toBeInTheDocument();
    expect(screen.getByText('b@b.de')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('shows a hint when the assigned department no longer exists', () => {
    render(
      <UsersClient
        users={[
          {
            user_id: 'u1',
            email: 'a@b.de',
            registered_at: '2026-01-01T00:00:00.000Z',
            admin: false,
            approved: true,
            department_id: 999,
          },
        ]}
        departmentOptions={departmentOptions}
      />
    );
    expect(
      screen.getByText('Bisheriger Bereich wurde gelöscht')
    ).toBeInTheDocument();
  });

  it('lists users waiting for approval first and counts them', () => {
    render(
      <UsersClient
        users={[
          user({ email: 'a@b.de' }),
          user({ email: 'b@b.de', approved: false }),
          user({ email: 'c@b.de', approved: false }),
        ]}
        departmentOptions={departmentOptions}
      />
    );

    const rows = screen.getAllByRole('row').slice(1);
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('b@b.de'),
      expect.stringContaining('c@b.de'),
      expect.stringContaining('a@b.de'),
    ]);
    expect(
      screen.getByText('2 Nutzer warten auf Freischaltung')
    ).toBeInTheDocument();
  });

  it('approves a waiting user', async () => {
    mockSetUserApproval.mockResolvedValue({ success: true });
    render(
      <UsersClient
        users={[user({ email: 'new@b.de', approved: false })]}
        departmentOptions={departmentOptions}
      />
    );

    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'Zugang für new@b.de freischalten',
      })
    );

    await waitFor(() =>
      expect(mockSetUserApproval).toHaveBeenCalledWith('new@b.de', true)
    );
  });

  it('shows an error when the approval fails', async () => {
    mockSetUserApproval.mockResolvedValue({
      success: false,
      error: 'Nutzer nicht gefunden',
    });
    render(
      <UsersClient
        users={[user({ email: 'new@b.de', approved: false })]}
        departmentOptions={departmentOptions}
      />
    );

    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'Zugang für new@b.de freischalten',
      })
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Nutzer nicht gefunden'
    );
  });

  it('does not offer to revoke the access of admins', () => {
    render(
      <UsersClient
        users={[user({ email: 'admin@b.de', admin: true, approved: false })]}
        departmentOptions={departmentOptions}
      />
    );

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getByText('Immer (Admin)')).toBeInTheDocument();
    expect(screen.queryByText('Wartet')).not.toBeInTheDocument();
    expect(screen.queryByText(/auf Freischaltung/)).not.toBeInTheDocument();
  });
});
