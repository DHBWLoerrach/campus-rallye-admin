import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import UsersClient from './UsersClient';

vi.mock('@/actions/local-users', () => ({
  assignUserDepartment: vi.fn(),
}));

const departmentOptions = [
  { id: 7, name: 'HoKo/Marketing' },
  { id: 8, name: 'SZI' },
];

describe('UsersClient', () => {
  it('renders one row per user with email', () => {
    render(
      <UsersClient
        users={[
          {
            user_id: 'u1',
            email: 'a@b.de',
            registered_at: '2026-01-01T00:00:00.000Z',
            admin: false,
            department_id: 7,
          },
          {
            user_id: 'u2',
            email: 'b@b.de',
            registered_at: '2026-01-02T00:00:00.000Z',
            admin: true,
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
});
