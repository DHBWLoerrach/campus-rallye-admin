import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRequireProfile, mockCreateClient, mockRevalidatePath } = vi.hoisted(
  () => ({
    mockRequireProfile: vi.fn(),
    mockCreateClient: vi.fn(),
    mockRevalidatePath: vi.fn(),
  })
);

vi.mock('@/lib/require-profile', () => ({
  requireProfile: mockRequireProfile,
}));

vi.mock('@/lib/supabase', () => ({
  default: mockCreateClient,
}));

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}));

describe('updateRallye', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  type UpdatePayload = {
    name: string;
    status: string;
    password: string;
    end_time?: Date;
  };

  const setupSupabaseUpdate = () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 1 }, error: null });
    const selectEq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq: selectEq }));
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn<(payload: UpdatePayload) => { eq: typeof eq }>(() => ({
      eq,
    }));
    const from = vi.fn(() => ({ select, update }));
    mockCreateClient.mockResolvedValue({ from });
    return { from, update, eq, select, selectEq, maybeSingle };
  };

  const makeFormData = (entries: Record<string, string>) => {
    const formData = new FormData();
    Object.entries(entries).forEach(([key, value]) => {
      formData.set(key, value);
    });
    return formData;
  };

  it('skips end_time update when input is empty', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const { update } = setupSupabaseUpdate();

    const { updateRallye } = await import('./rallye');
    await updateRallye(null, makeFormData({
      id: '1',
      name: 'Test',
      status: 'running',
      end_time: '',
      password: 'secret',
    }));

    expect(update).toHaveBeenCalledWith({
      name: 'Test',
      status: 'running',
      password: 'secret',
    });
  });

  it('returns an error for invalid end_time', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const { update } = setupSupabaseUpdate();

    const { updateRallye } = await import('./rallye');
    const result = await updateRallye(null, makeFormData({
      id: '1',
      name: 'Test',
      status: 'running',
      end_time: 'not-a-date',
      password: 'secret',
    }));

    expect(result).toEqual({ success: false, error: 'Ungültiges Datum' });
    expect(update).not.toHaveBeenCalled();
  });

  it('updates end_time when valid', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const { update } = setupSupabaseUpdate();

    const { updateRallye } = await import('./rallye');
    await updateRallye(null, makeFormData({
      id: '1',
      name: 'Test',
      status: 'running',
      end_time: '2024-02-10T10:11:12.000Z',
      password: 'secret',
    }));

    expect(update).toHaveBeenCalledTimes(1);
    const payload = update.mock.calls[0][0];
    expect(payload).toMatchObject({
      name: 'Test',
      status: 'running',
      password: 'secret',
    });
    const endTime = payload.end_time;
    expect(endTime).toBeInstanceOf(Date);
    if (!(endTime instanceof Date)) {
      throw new Error('Expected end_time to be a Date');
    }
    expect(endTime.toISOString()).toBe('2024-02-10T10:11:12.000Z');
  });
});
