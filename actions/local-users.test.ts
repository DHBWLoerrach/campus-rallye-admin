import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockRequireAdmin,
  mockCreateClient,
  mockRevalidatePath,
  mockListLocalUsers,
  mockSetLocalUserDepartment,
  mockSetLocalUserApproved,
} = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockCreateClient: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockListLocalUsers: vi.fn(),
  mockSetLocalUserDepartment: vi.fn(),
  mockSetLocalUserApproved: vi.fn(),
}));

vi.mock('@/lib/require-profile', () => ({
  requireAdmin: mockRequireAdmin,
}));

vi.mock('@/lib/supabase', () => ({
  default: mockCreateClient,
}));

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock('@/lib/db/local-user', () => ({
  listLocalUsers: mockListLocalUsers,
  setLocalUserDepartment: mockSetLocalUserDepartment,
  setLocalUserApproved: mockSetLocalUserApproved,
}));

// Supabase mock: department lookup via .from().select().eq().maybeSingle()
const makeSupabase = (
  department: { id: number } | null,
  error: unknown = null
) => ({
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: department, error }),
      }),
    }),
  }),
});

describe('getLocalUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('requires admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Denied'));
    const { getLocalUsers } = await import('./local-users');
    await expect(getLocalUsers()).rejects.toThrow('Denied');
    expect(mockListLocalUsers).not.toHaveBeenCalled();
  });

  it('returns users from the local database', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });
    const users = [
      {
        user_id: 'u1',
        email: 'a@b.de',
        registered_at: '2026-01-01',
        admin: false,
        approved: true,
        department_id: null,
      },
    ];
    mockListLocalUsers.mockReturnValue(users);
    const { getLocalUsers } = await import('./local-users');
    const result = await getLocalUsers();
    expect(result).toEqual({ success: true, data: users });
  });
});

describe('assignUserDepartment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('rejects an empty user id', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });
    const { assignUserDepartment } = await import('./local-users');
    const result = await assignUserDepartment('', 1);
    expect(result.success).toBe(false);
    expect(mockSetLocalUserDepartment).not.toHaveBeenCalled();
  });

  it('validates the department against Supabase before writing', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });
    mockCreateClient.mockResolvedValue(makeSupabase(null));
    const { assignUserDepartment } = await import('./local-users');
    const result = await assignUserDepartment('u1', 99);
    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected failure');
    expect(result.error).toBe('Bereich nicht gefunden');
    expect(mockSetLocalUserDepartment).not.toHaveBeenCalled();
  });

  it('assigns an existing department and revalidates', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });
    mockCreateClient.mockResolvedValue(makeSupabase({ id: 7 }));
    mockSetLocalUserDepartment.mockReturnValue(true);
    const { assignUserDepartment } = await import('./local-users');
    const result = await assignUserDepartment('u1', 7);
    expect(result.success).toBe(true);
    expect(mockSetLocalUserDepartment).toHaveBeenCalledWith('u1', 7);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/users');
  });

  it('clears an assignment without querying Supabase', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });
    mockSetLocalUserDepartment.mockReturnValue(true);
    const { assignUserDepartment } = await import('./local-users');
    const result = await assignUserDepartment('u1', null);
    expect(result.success).toBe(true);
    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(mockSetLocalUserDepartment).toHaveBeenCalledWith('u1', null);
  });

  it('fails when the user does not exist locally', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });
    mockSetLocalUserDepartment.mockReturnValue(false);
    const { assignUserDepartment } = await import('./local-users');
    const result = await assignUserDepartment('missing', null);
    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected failure');
    expect(result.error).toBe('Nutzer nicht gefunden');
  });
});

describe('setUserApproval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('requires admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Denied'));
    const { setUserApproval } = await import('./local-users');
    await expect(setUserApproval('u1', true)).rejects.toThrow('Denied');
    expect(mockSetLocalUserApproved).not.toHaveBeenCalled();
  });

  it('rejects an empty user id', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });
    const { setUserApproval } = await import('./local-users');
    const result = await setUserApproval('', true);
    expect(result.success).toBe(false);
    expect(mockSetLocalUserApproved).not.toHaveBeenCalled();
  });

  it('approves a user and revalidates', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });
    mockSetLocalUserApproved.mockReturnValue(true);
    const { setUserApproval } = await import('./local-users');
    const result = await setUserApproval('u1', true);
    expect(result).toEqual({
      success: true,
      data: { message: 'Zugang freigeschaltet' },
    });
    expect(mockSetLocalUserApproved).toHaveBeenCalledWith('u1', true);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/users');
  });

  it('revokes the approval of a user', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });
    mockSetLocalUserApproved.mockReturnValue(true);
    const { setUserApproval } = await import('./local-users');
    const result = await setUserApproval('u1', false);
    expect(result.success).toBe(true);
    expect(mockSetLocalUserApproved).toHaveBeenCalledWith('u1', false);
  });

  it('fails when the user does not exist locally', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });
    mockSetLocalUserApproved.mockReturnValue(false);
    const { setUserApproval } = await import('./local-users');
    const result = await setUserApproval('missing', true);
    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected failure');
    expect(result.error).toBe('Nutzer nicht gefunden');
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});
