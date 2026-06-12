import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetUserContext, mockGetLocalUser, mockUpsertLocalUser } =
  vi.hoisted(() => ({
    mockGetUserContext: vi.fn(),
    mockGetLocalUser: vi.fn(),
    mockUpsertLocalUser: vi.fn(),
  }));

vi.mock('./user-context', () => ({
  getUserContext: mockGetUserContext,
}));

vi.mock('./db/local-user', () => ({
  getLocalUser: mockGetLocalUser,
  upsertLocalUser: mockUpsertLocalUser,
}));

describe('requireProfile', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('rejects non-staff users before reading the local DB', async () => {
    mockGetUserContext.mockResolvedValue({
      uuid: 'user-1',
      email: null,
      roles: ['student'],
    });

    const { requireProfile } = await import('./require-profile');

    await expect(requireProfile()).rejects.toThrow('Zugriff verweigert');
    expect(mockGetLocalUser).not.toHaveBeenCalled();
    expect(mockUpsertLocalUser).not.toHaveBeenCalled();
  });

  it('returns existing profile for staff users', async () => {
    mockGetUserContext.mockResolvedValue({
      uuid: 'user-2',
      email: 'staff@example.test',
      roles: ['staff'],
    });

    mockGetLocalUser.mockReturnValue({
      user_id: 'user-2',
      email: 'staff@example.test',
      registered_at: '2026-05-15T00:00:00.000Z',
      admin: true,
    });

    const { requireProfile } = await import('./require-profile');

    await expect(requireProfile()).resolves.toEqual({
      user_id: 'user-2',
      admin: true,
      created_at: '2026-05-15T00:00:00.000Z',
    });
    expect(mockUpsertLocalUser).not.toHaveBeenCalled();
  });

  it('throws when no profile exists and createProfile is false', async () => {
    mockGetUserContext.mockResolvedValue({
      uuid: 'user-no-profile',
      email: 'staff@example.test',
      roles: ['staff'],
    });

    mockGetLocalUser.mockReturnValue(null);

    const { requireProfile } = await import('./require-profile');

    await expect(requireProfile()).rejects.toThrow(
      'Profil nicht vorhanden – Zugriff verweigert'
    );
    expect(mockUpsertLocalUser).not.toHaveBeenCalled();
  });

  it('creates a profile when createProfile is true and none exists', async () => {
    mockGetUserContext.mockResolvedValue({
      uuid: 'new-user',
      email: 'new@example.test',
      roles: ['staff'],
    });

    mockGetLocalUser.mockReturnValue(null);
    mockUpsertLocalUser.mockReturnValue({
      user_id: 'new-user',
      email: 'new@example.test',
      registered_at: '2026-05-15T00:00:00.000Z',
      admin: false,
    });

    const { requireProfile } = await import('./require-profile');

    await expect(requireProfile(true)).resolves.toEqual({
      user_id: 'new-user',
      admin: false,
      created_at: '2026-05-15T00:00:00.000Z',
    });
    expect(mockUpsertLocalUser).toHaveBeenCalledWith(
      'new-user',
      'new@example.test'
    );
  });

  it('accepts non-staff users whose email is in ALLOWED_EMAILS', async () => {
    process.env.ALLOWED_EMAILS = 'allowed@example.test';

    mockGetUserContext.mockResolvedValue({
      uuid: 'user-3',
      email: 'allowed@example.test',
      roles: ['student'],
    });

    mockGetLocalUser.mockReturnValue({
      user_id: 'user-3',
      email: 'allowed@example.test',
      registered_at: '2026-05-15T00:00:00.000Z',
      admin: false,
    });

    const { requireProfile } = await import('./require-profile');

    await expect(requireProfile()).resolves.toEqual({
      user_id: 'user-3',
      admin: false,
      created_at: '2026-05-15T00:00:00.000Z',
    });
  });
});

describe('requireAdmin', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns profile for admin users', async () => {
    mockGetUserContext.mockResolvedValue({
      uuid: 'admin-1',
      email: 'admin@example.test',
      roles: ['staff'],
    });

    mockGetLocalUser.mockReturnValue({
      user_id: 'admin-1',
      email: 'admin@example.test',
      registered_at: '2026-05-15T00:00:00.000Z',
      admin: true,
    });

    const { requireAdmin } = await import('./require-profile');

    await expect(requireAdmin()).resolves.toEqual({
      user_id: 'admin-1',
      admin: true,
      created_at: '2026-05-15T00:00:00.000Z',
    });
  });

  it('rejects non-admin users', async () => {
    mockGetUserContext.mockResolvedValue({
      uuid: 'user-4',
      email: 'staff@example.test',
      roles: ['staff'],
    });

    mockGetLocalUser.mockReturnValue({
      user_id: 'user-4',
      email: 'staff@example.test',
      registered_at: '2026-05-15T00:00:00.000Z',
      admin: false,
    });

    const { requireAdmin } = await import('./require-profile');

    await expect(requireAdmin()).rejects.toThrow(
      'Admin-Berechtigung erforderlich'
    );
  });

  it('rejects users without profile', async () => {
    mockGetUserContext.mockResolvedValue({
      uuid: 'user-5',
      email: 'staff@example.test',
      roles: ['staff'],
    });

    mockGetLocalUser.mockReturnValue(null);

    const { requireAdmin } = await import('./require-profile');

    await expect(requireAdmin()).rejects.toThrow(
      'Profil nicht vorhanden – Zugriff verweigert'
    );
  });
});
