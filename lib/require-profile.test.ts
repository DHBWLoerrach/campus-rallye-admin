import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetUserContext, mockCreateClient, mockInsertLocalUser } = vi.hoisted(
  () => ({
    mockGetUserContext: vi.fn(),
    mockCreateClient: vi.fn(),
    mockInsertLocalUser: vi.fn(),
  })
);

vi.mock('./user-context', () => ({
  getUserContext: mockGetUserContext,
}));

vi.mock('./supabase', () => ({
  default: mockCreateClient,
}));

vi.mock('./db/insert-local-user', () => ({
  insertLocalUser: mockInsertLocalUser,
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

  it('rejects non-staff users before querying Supabase', async () => {
    mockGetUserContext.mockResolvedValue({
      uuid: 'user-1',
      email: null,
      roles: ['student'],
    });

    const { requireProfile } = await import('./require-profile');

    await expect(requireProfile()).rejects.toThrow('Zugriff verweigert');
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('returns existing profile for staff users', async () => {
    mockGetUserContext.mockResolvedValue({
      uuid: 'user-2',
      email: 'staff@example.test',
      roles: ['staff'],
    });

    const profileData = { user_id: 'user-2', admin: true };

    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: profileData, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    mockCreateClient.mockResolvedValue({ from });

    const { requireProfile } = await import('./require-profile');

    await expect(requireProfile()).resolves.toEqual(profileData);
    expect(mockInsertLocalUser).not.toHaveBeenCalled();
  });

  it('accepts non-staff users whose email is in ALLOWED_EMAILS', async () => {
    process.env.ALLOWED_EMAILS = 'allowed@example.test';

    mockGetUserContext.mockResolvedValue({
      uuid: 'user-3',
      email: 'allowed@example.test',
      roles: ['student'],
    });

    const profileData = { user_id: 'user-3', admin: false };

    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: profileData, error: null });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    mockCreateClient.mockResolvedValue({ from });

    const { requireProfile } = await import('./require-profile');

    await expect(requireProfile()).resolves.toEqual(profileData);
  });
});
