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

  const makeFormData = (
    entries: Record<string, string>,
    multiEntries?: Record<string, string[]>
  ) => {
    const formData = new FormData();
    Object.entries(entries).forEach(([key, value]) => {
      formData.set(key, value);
    });
    if (multiEntries) {
      Object.entries(multiEntries).forEach(([key, values]) => {
        values.forEach((value) => formData.append(key, value));
      });
    }
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

  it('does not sync department assignments without department_sync marker', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 1 }, error: null });
    const rallyeSelectEq = vi.fn(() => ({ maybeSingle }));
    const rallyeSelect = vi.fn(() => ({ eq: rallyeSelectEq }));
    const rallyeUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const rallyeUpdate = vi.fn(() => ({ eq: rallyeUpdateEq }));

    const joinSelect = vi.fn();
    const joinInsert = vi.fn();
    const joinDelete = vi.fn();

    const from = vi.fn((table: string) => {
      if (table === 'rallye') return { select: rallyeSelect, update: rallyeUpdate };
      if (table === 'join_department_rallye') {
        return { select: joinSelect, insert: joinInsert, delete: joinDelete };
      }
      return {};
    });
    mockCreateClient.mockResolvedValue({ from });

    const { updateRallye } = await import('./rallye');
    const result = await updateRallye(
      null,
      makeFormData(
        {
          id: '1',
          name: 'Test',
          status: 'running',
          end_time: '',
          password: 'secret',
        },
        { department_ids: ['10', '20'] }
      )
    );

    expect(result?.success).toBe(true);
    expect(joinSelect).not.toHaveBeenCalled();
    expect(joinInsert).not.toHaveBeenCalled();
    expect(joinDelete).not.toHaveBeenCalled();
  });

  it('syncs department assignments when department_sync marker is present', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 1 }, error: null });
    const rallyeSelectEq = vi.fn(() => ({ maybeSingle }));
    const rallyeSelect = vi.fn(() => ({ eq: rallyeSelectEq }));
    const rallyeUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const rallyeUpdate = vi.fn(() => ({ eq: rallyeUpdateEq }));

    const joinSelectEq = vi.fn().mockResolvedValue({
      data: [{ department_id: 10 }, { department_id: 20 }],
      error: null,
    });
    const joinSelect = vi.fn(() => ({ eq: joinSelectEq }));
    const joinInsert = vi.fn().mockResolvedValue({ error: null });
    const joinDeleteIn = vi.fn().mockResolvedValue({ error: null });
    const joinDeleteEq = vi.fn(() => ({ in: joinDeleteIn }));
    const joinDelete = vi.fn(() => ({ eq: joinDeleteEq }));

    const from = vi.fn((table: string) => {
      if (table === 'rallye') return { select: rallyeSelect, update: rallyeUpdate };
      if (table === 'join_department_rallye') {
        return { select: joinSelect, insert: joinInsert, delete: joinDelete };
      }
      return {};
    });
    mockCreateClient.mockResolvedValue({ from });

    const { updateRallye } = await import('./rallye');
    const result = await updateRallye(
      null,
      makeFormData(
        {
          id: '1',
          name: 'Test',
          status: 'running',
          end_time: '',
          password: 'secret',
          department_sync: '1',
        },
        { department_ids: ['20', '30'] }
      )
    );

    expect(result?.success).toBe(true);
    expect(joinSelectEq).toHaveBeenCalledWith('rallye_id', 1);
    expect(joinInsert).toHaveBeenCalledWith([
      { department_id: 30, rallye_id: 1 },
    ]);
    expect(joinDeleteEq).toHaveBeenCalledWith('rallye_id', 1);
    expect(joinDeleteIn).toHaveBeenCalledWith('department_id', [10]);
  });
});
