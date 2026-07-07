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
    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: 1 }, error: null });
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
    await updateRallye(
      null,
      makeFormData({
        id: '1',
        name: 'Test',
        status: 'running',
        end_time: '',
        password: 'secret',
      })
    );

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
    const result = await updateRallye(
      null,
      makeFormData({
        id: '1',
        name: 'Test',
        status: 'running',
        end_time: 'not-a-date',
        password: 'secret',
      })
    );

    expect(result).toEqual({ success: false, error: 'Ungültiges Datum' });
    expect(update).not.toHaveBeenCalled();
  });

  it('updates end_time when valid', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const { update } = setupSupabaseUpdate();

    const { updateRallye } = await import('./rallye');
    await updateRallye(
      null,
      makeFormData({
        id: '1',
        name: 'Test',
        status: 'running',
        end_time: '2024-02-10T10:11:12.000Z',
        password: 'secret',
      })
    );

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

    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: 1 }, error: null });
    const rallyeSelectEq = vi.fn(() => ({ maybeSingle }));
    const rallyeSelect = vi.fn(() => ({ eq: rallyeSelectEq }));
    const rallyeUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const rallyeUpdate = vi.fn(() => ({ eq: rallyeUpdateEq }));

    const from = vi.fn((table: string) => {
      if (table === 'rallye')
        return { select: rallyeSelect, update: rallyeUpdate };
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
    expect(rallyeUpdate).toHaveBeenCalledWith({
      name: 'Test',
      status: 'running',
      password: 'secret',
    });
  });

  it('syncs department assignments when department_sync marker is present', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: 1 }, error: null });
    const rallyeSelectEq = vi.fn(() => ({ maybeSingle }));
    const rallyeSelect = vi.fn(() => ({ eq: rallyeSelectEq }));
    const rallyeUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const rallyeUpdate = vi.fn(() => ({ eq: rallyeUpdateEq }));

    const from = vi.fn((table: string) => {
      if (table === 'rallye')
        return { select: rallyeSelect, update: rallyeUpdate };
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
        { department_ids: ['20'] }
      )
    );

    expect(result?.success).toBe(true);
    expect(rallyeUpdate).toHaveBeenCalledWith({
      name: 'Test',
      status: 'running',
      password: 'secret',
      department_id: 20,
    });
  });

  it('rejects sync when zero or multiple departments are selected', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: 1 }, error: null });
    const rallyeSelectEq = vi.fn(() => ({ maybeSingle }));
    const rallyeSelect = vi.fn(() => ({ eq: rallyeSelectEq }));
    const rallyeUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const rallyeUpdate = vi.fn(() => ({ eq: rallyeUpdateEq }));

    const from = vi.fn((table: string) => {
      if (table === 'rallye') {
        return { select: rallyeSelect, update: rallyeUpdate };
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
        { department_ids: ['10', '20'] }
      )
    );

    expect(result).toEqual({
      success: false,
      error: 'Genau ein Bereich muss zugeordnet werden',
    });
    expect(rallyeUpdate).not.toHaveBeenCalled();
  });
});

describe('advanceRallyeStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  // Supabase mock covering: select rallye status, count voting questions, update
  const makeSupabase = (
    status: string | null,
    votingCount: number,
    updateError: unknown = null
  ) => {
    const updateEq = vi.fn().mockResolvedValue({ error: updateError });
    const update = vi.fn(() => ({ eq: updateEq }));
    const from = vi.fn((table: string) => {
      if (table === 'rallye') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: status === null ? null : { id: 5, status },
                error: null,
              }),
            })),
          })),
          update,
        };
      }
      // join_rallye_questions voting count
      const countEq2 = vi
        .fn()
        .mockResolvedValue({ count: votingCount, error: null });
      const countEq1 = vi.fn(() => ({ eq: countEq2 }));
      return { select: vi.fn(() => ({ eq: countEq1 })) };
    });
    return { from, update, updateEq };
  };

  it('advances inactive to running', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase('inactive', 0);
    mockCreateClient.mockResolvedValue(supabase);

    const { advanceRallyeStatus } = await import('./rallye');
    const result = await advanceRallyeStatus(5, 'running');

    expect(result.success).toBe(true);
    expect(supabase.update).toHaveBeenCalledWith({ status: 'running' });
  });

  it('rejects a target that does not match the guided transition', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    mockCreateClient.mockResolvedValue(makeSupabase('inactive', 0));

    const { advanceRallyeStatus } = await import('./rallye');
    const result = await advanceRallyeStatus(5, 'ended');

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected failure');
    expect(result.error).toBe('Ungültiger Statuswechsel');
  });

  it('goes running to voting only when voting questions exist', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    mockCreateClient.mockResolvedValue(makeSupabase('running', 2));

    const { advanceRallyeStatus } = await import('./rallye');
    const result = await advanceRallyeStatus(5, 'voting');
    expect(result.success).toBe(true);
  });

  it('goes running to ranking when no voting questions exist', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    mockCreateClient.mockResolvedValue(makeSupabase('running', 0));

    const { advanceRallyeStatus } = await import('./rallye');
    expect((await advanceRallyeStatus(5, 'voting')).success).toBe(false);
    vi.resetModules();
    mockCreateClient.mockResolvedValue(makeSupabase('running', 0));
    const { advanceRallyeStatus: advance2 } = await import('./rallye');
    expect((await advance2(5, 'ranking')).success).toBe(true);
  });

  it('fails for unknown rallye', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    mockCreateClient.mockResolvedValue(makeSupabase(null, 0));

    const { advanceRallyeStatus } = await import('./rallye');
    const result = await advanceRallyeStatus(999, 'running');
    expect(result.success).toBe(false);
  });

  it('rejects an invalid id without touching Supabase', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const { advanceRallyeStatus } = await import('./rallye');
    const result = await advanceRallyeStatus(-1, 'running');
    expect(result.success).toBe(false);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});
