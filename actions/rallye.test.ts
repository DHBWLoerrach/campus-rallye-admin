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
    end_time: string | null;
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

  it('clears end_time when input is empty', async () => {
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
      end_time: null,
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
        end_time: 'not-a-time',
        password: 'secret',
      })
    );

    expect(result).toEqual({ success: false, error: 'Ungültige Uhrzeit' });
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
        end_time: '10:11',
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
    expect(payload.end_time).toBe('10:11');
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
      if (table === 'rallyes')
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
      end_time: null,
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
      if (table === 'rallyes')
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
      end_time: null,
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
      if (table === 'rallyes') {
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
      if (table === 'rallyes') {
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

  it('advances ready to running', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase('ready', 0);
    mockCreateClient.mockResolvedValue(supabase);

    const { advanceRallyeStatus } = await import('./rallye');
    const result = await advanceRallyeStatus(5, 'running');

    expect(result.success).toBe(true);
    expect(supabase.update).toHaveBeenCalledWith({ status: 'running' });
  });

  it('sets the planned end time when starting the rallye', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase('ready', 0);
    mockCreateClient.mockResolvedValue(supabase);

    const { advanceRallyeStatus } = await import('./rallye');
    const result = await advanceRallyeStatus(5, 'running', '16:00');

    expect(result.success).toBe(true);
    expect(supabase.update).toHaveBeenCalledWith({
      status: 'running',
      end_time: '16:00',
    });
  });

  it('rejects an invalid planned end time', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase('ready', 0);
    mockCreateClient.mockResolvedValue(supabase);

    const { advanceRallyeStatus } = await import('./rallye');
    const result = await advanceRallyeStatus(5, 'running', 'keine-zeit');

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected failure');
    expect(result.error).toBe('Ungültige Uhrzeit');
    expect(supabase.update).not.toHaveBeenCalled();
  });

  it('rejects a target that does not match the guided transition', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    mockCreateClient.mockResolvedValue(makeSupabase('ready', 0));

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

  it('goes running to results when no voting questions exist', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    mockCreateClient.mockResolvedValue(makeSupabase('running', 0));

    const { advanceRallyeStatus } = await import('./rallye');
    expect((await advanceRallyeStatus(5, 'voting')).success).toBe(false);
    vi.resetModules();
    mockCreateClient.mockResolvedValue(makeSupabase('running', 0));
    const { advanceRallyeStatus: advance2 } = await import('./rallye');
    expect((await advance2(5, 'results')).success).toBe(true);
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

describe('duplicateRallye', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  const makeSupabase = (opts: {
    source?: {
      id: number;
      name: string;
      department_id: number | null;
    } | null;
    joins?: Array<{ question_id: number; is_voting: boolean }>;
    insertError?: unknown;
  }) => {
    const insertedRallye = { id: 99 };
    const insertSelectSingle = vi.fn().mockResolvedValue({
      data: insertedRallye,
      error: opts.insertError ?? null,
    });
    const insertSelect = vi.fn(() => ({ single: insertSelectSingle }));
    const rallyeInsert = vi.fn(() => ({ select: insertSelect }));
    const joinInsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      if (table === 'rallyes') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data:
                  opts.source === null
                    ? null
                    : (opts.source ?? {
                        id: 5,
                        name: 'Studieninfotag',
                        department_id: 7,
                      }),
                error: null,
              }),
            })),
          })),
          insert: rallyeInsert,
        };
      }
      // join_rallye_questions
      return {
        select: vi.fn(() => ({
          eq: vi
            .fn()
            .mockResolvedValue({ data: opts.joins ?? [], error: null }),
        })),
        insert: joinInsert,
      };
    });
    return { from, rallyeInsert, joinInsert };
  };

  it('creates a draft copy with suffixed name', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase({});
    mockCreateClient.mockResolvedValue(supabase);

    const { duplicateRallye } = await import('./rallye');
    const result = await duplicateRallye(5);

    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Expected success');
    expect(result.data?.rallyeId).toBe(99);
    expect(supabase.rallyeInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Studieninfotag (Kopie)',
        status: 'draft',
        password: '',
        department_id: 7,
      })
    );
  });

  it('copies question assignments including voting flags', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase({
      joins: [
        { question_id: 1, is_voting: false },
        { question_id: 2, is_voting: true },
      ],
    });
    mockCreateClient.mockResolvedValue(supabase);

    const { duplicateRallye } = await import('./rallye');
    await duplicateRallye(5);

    expect(supabase.joinInsert).toHaveBeenCalledWith([
      { rallye_id: 99, question_id: 1, is_voting: false },
      { rallye_id: 99, question_id: 2, is_voting: true },
    ]);
  });

  it('skips join insert when the source has no questions', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase({ joins: [] });
    mockCreateClient.mockResolvedValue(supabase);

    const { duplicateRallye } = await import('./rallye');
    const result = await duplicateRallye(5);

    expect(result.success).toBe(true);
    expect(supabase.joinInsert).not.toHaveBeenCalled();
  });

  it('fails for unknown rallye', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    mockCreateClient.mockResolvedValue(makeSupabase({ source: null }));

    const { duplicateRallye } = await import('./rallye');
    expect((await duplicateRallye(999)).success).toBe(false);
  });

  it('rejects invalid ids without touching Supabase', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const { duplicateRallye } = await import('./rallye');
    expect((await duplicateRallye(0)).success).toBe(false);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});

describe('createRallyeWithQuestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  const makeSupabase = (opts: { departmentExists?: boolean }) => {
    const insertSelectSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: 42 }, error: null });
    const insertSelect = vi.fn(() => ({ single: insertSelectSingle }));
    const rallyeInsert = vi.fn(() => ({ select: insertSelect }));
    const joinInsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      if (table === 'department') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: opts.departmentExists === false ? null : { id: 7 },
                error: null,
              }),
            })),
          })),
        };
      }
      if (table === 'rallyes') {
        return { insert: rallyeInsert };
      }
      return { insert: joinInsert };
    });
    return { from, rallyeInsert, joinInsert };
  };

  it('creates a draft rallye with question assignments', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase({});
    mockCreateClient.mockResolvedValue(supabase);

    const { createRallyeWithQuestions } = await import('./rallye');
    const result = await createRallyeWithQuestions({
      name: "Girl's Day 2027",
      departmentId: 7,
      endTime: '13:00',
      password: 'geheim',
      questionIds: [1, 2],
    });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Expected success');
    expect(result.data?.rallyeId).toBe(42);
    expect(supabase.rallyeInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Girl's Day 2027",
        status: 'draft',
        password: 'geheim',
        department_id: 7,
      })
    );
    expect(supabase.joinInsert).toHaveBeenCalledWith([
      { rallye_id: 42, question_id: 1, is_voting: false },
      { rallye_id: 42, question_id: 2, is_voting: false },
    ]);
  });

  it('stores a null end time when none is planned', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase({});
    mockCreateClient.mockResolvedValue(supabase);

    const { createRallyeWithQuestions } = await import('./rallye');
    const result = await createRallyeWithQuestions({
      name: 'Ohne Ende',
      departmentId: 7,
      endTime: null,
      password: '',
      questionIds: [],
    });

    expect(result.success).toBe(true);
    expect(supabase.rallyeInsert).toHaveBeenCalledWith(
      expect.objectContaining({ end_time: null })
    );
  });

  it('fails when the department does not exist', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    mockCreateClient.mockResolvedValue(
      makeSupabase({ departmentExists: false })
    );

    const { createRallyeWithQuestions } = await import('./rallye');
    const result = await createRallyeWithQuestions({
      name: 'X',
      departmentId: 99,
      endTime: null,
      password: '',
      questionIds: [],
    });
    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected failure');
    expect(result.error).toBe('Bereich nicht gefunden');
  });

  it('rejects an empty name without touching Supabase', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const { createRallyeWithQuestions } = await import('./rallye');
    const result = await createRallyeWithQuestions({
      name: '',
      departmentId: 7,
      endTime: null,
      password: '',
      questionIds: [],
    });
    expect(result.success).toBe(false);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('rejects an invalid end time', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const { createRallyeWithQuestions } = await import('./rallye');
    const result = await createRallyeWithQuestions({
      name: 'X',
      departmentId: 7,
      endTime: 'keine-zeit',
      password: '',
      questionIds: [],
    });
    expect(result.success).toBe(false);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});
