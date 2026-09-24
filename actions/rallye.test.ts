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
    rallye_code: string;
    rallye_end: string | null;
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

  it('clears rallye_end when input is empty', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const { update } = setupSupabaseUpdate();

    const { updateRallye } = await import('./rallye');
    await updateRallye(
      null,
      makeFormData({
        id: '1',
        name: 'Test',
        status: 'running',
        rallye_end: '',
        rallye_code: 'secret',
      })
    );

    expect(update).toHaveBeenCalledWith({
      name: 'Test',
      status: 'running',
      rallye_code: 'secret',
      rallye_end: null,
    });
  });

  it('returns an error for invalid rallye_end', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const { update } = setupSupabaseUpdate();

    const { updateRallye } = await import('./rallye');
    const result = await updateRallye(
      null,
      makeFormData({
        id: '1',
        name: 'Test',
        status: 'running',
        rallye_end: 'not-a-time',
        rallye_code: 'secret',
      })
    );

    expect(result).toEqual({ success: false, error: 'Ungültige Uhrzeit' });
    expect(update).not.toHaveBeenCalled();
  });

  it('updates rallye_end when valid', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const { update } = setupSupabaseUpdate();

    const { updateRallye } = await import('./rallye');
    await updateRallye(
      null,
      makeFormData({
        id: '1',
        name: 'Test',
        status: 'running',
        rallye_end: '10:11',
        rallye_code: 'secret',
      })
    );

    expect(update).toHaveBeenCalledTimes(1);
    const payload = update.mock.calls[0][0];
    expect(payload).toMatchObject({
      name: 'Test',
      status: 'running',
      rallye_code: 'secret',
    });
    expect(payload.rallye_end).toBe('10:11');
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
          rallye_end: '',
          rallye_code: 'secret',
        },
        { department_ids: ['10', '20'] }
      )
    );

    expect(result?.success).toBe(true);
    expect(rallyeUpdate).toHaveBeenCalledWith({
      name: 'Test',
      status: 'running',
      rallye_code: 'secret',
      rallye_end: null,
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
          rallye_end: '',
          rallye_code: 'secret',
          department_sync: '1',
        },
        { department_ids: ['20'] }
      )
    );

    expect(result?.success).toBe(true);
    expect(rallyeUpdate).toHaveBeenCalledWith({
      name: 'Test',
      status: 'running',
      rallye_code: 'secret',
      rallye_end: null,
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
          rallye_end: '',
          rallye_code: 'secret',
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
    updateError: unknown = null,
    rallyeCode: string = 'code123'
  ) => {
    const updateEq = vi.fn().mockResolvedValue({ error: updateError });
    const update = vi.fn(() => ({ eq: updateEq }));
    const from = vi.fn((table: string) => {
      if (table === 'rallyes') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data:
                  status === null
                    ? null
                    : { id: 5, status, rallye_code: rallyeCode },
                error: null,
              }),
            })),
          })),
          update,
        };
      }
      // rallye_questions voting count
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
      rallye_end: '16:00',
    });
  });

  it('refuses to start without any rallye code', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase('ready', 0, null, '');
    mockCreateClient.mockResolvedValue(supabase);

    const { advanceRallyeStatus } = await import('./rallye');
    const result = await advanceRallyeStatus(5, 'running');

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected failure');
    expect(result.error).toBe('Für den Start wird ein Rallye-Code benötigt');
    expect(supabase.update).not.toHaveBeenCalled();
  });

  it('accepts a code supplied at start and stores it', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase('ready', 0, null, '');
    mockCreateClient.mockResolvedValue(supabase);

    const { advanceRallyeStatus } = await import('./rallye');
    const result = await advanceRallyeStatus(
      5,
      'running',
      undefined,
      '  campus-427  '
    );

    expect(result.success).toBe(true);
    expect(supabase.update).toHaveBeenCalledWith({
      status: 'running',
      rallye_code: 'campus-427',
    });
  });

  it('keeps the stored code when starting without a new one', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase('ready', 0, null, 'stored-code');
    mockCreateClient.mockResolvedValue(supabase);

    const { advanceRallyeStatus } = await import('./rallye');
    const result = await advanceRallyeStatus(5, 'running');

    expect(result.success).toBe(true);
    // The stored code is untouched, so no rallye_code is written.
    expect(supabase.update).toHaveBeenCalledWith({ status: 'running' });
  });

  it('does not require a code for non-start transitions', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase('running', 0, null, '');
    mockCreateClient.mockResolvedValue(supabase);

    const { advanceRallyeStatus } = await import('./rallye');
    const result = await advanceRallyeStatus(5, 'results');

    expect(result.success).toBe(true);
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
      // rallye_questions
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
        rallye_code: '',
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

  const makeSupabase = (opts: {
    departmentExists?: boolean;
    questionTypes?: Array<{ id: number; type: string }>;
  }) => {
    const insertSelectSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: 42 }, error: null });
    const insertSelect = vi.fn(() => ({ single: insertSelectSingle }));
    const rallyeInsert = vi.fn(() => ({ select: insertSelect }));
    const joinInsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      if (table === 'departments') {
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
      if (table === 'questions') {
        return {
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({
              data: opts.questionTypes ?? [],
              error: null,
            }),
          })),
        };
      }
      return { insert: joinInsert };
    });
    return { from, rallyeInsert, joinInsert };
  };

  it('creates a draft rallye with question assignments', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase({
      questionTypes: [
        { id: 1, type: 'knowledge' },
        { id: 2, type: 'multiple_choice' },
      ],
    });
    mockCreateClient.mockResolvedValue(supabase);

    const { createRallyeWithQuestions } = await import('./rallye');
    const result = await createRallyeWithQuestions({
      name: "Girl's Day 2027",
      departmentId: 7,
      endTime: '13:00',
      rallyeCode: 'geheim',
      questionIds: [1, 2],
    });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Expected success');
    expect(result.data?.rallyeId).toBe(42);
    expect(supabase.rallyeInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Girl's Day 2027",
        status: 'draft',
        rallye_code: 'geheim',
        department_id: 7,
      })
    );
    expect(supabase.joinInsert).toHaveBeenCalledWith([
      { rallye_id: 42, question_id: 1, is_voting: false },
      { rallye_id: 42, question_id: 2, is_voting: false },
    ]);
  });

  it('defaults upload questions to voting when assigning', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase({
      questionTypes: [
        { id: 1, type: 'knowledge' },
        { id: 2, type: 'upload' },
      ],
    });
    mockCreateClient.mockResolvedValue(supabase);

    const { createRallyeWithQuestions } = await import('./rallye');
    const result = await createRallyeWithQuestions({
      name: 'Foto-Rallye',
      departmentId: 7,
      endTime: null,
      rallyeCode: 'code',
      questionIds: [1, 2],
    });

    expect(result.success).toBe(true);
    expect(supabase.joinInsert).toHaveBeenCalledWith([
      { rallye_id: 42, question_id: 1, is_voting: false },
      { rallye_id: 42, question_id: 2, is_voting: true },
    ]);
  });

  it('rejects more than one upload question before creating the rallye', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase({
      questionTypes: [
        { id: 1, type: 'upload' },
        { id: 2, type: 'upload' },
      ],
    });
    mockCreateClient.mockResolvedValue(supabase);

    const { createRallyeWithQuestions } = await import('./rallye');
    const result = await createRallyeWithQuestions({
      name: 'Foto-Rallye',
      departmentId: 7,
      endTime: null,
      rallyeCode: 'code',
      questionIds: [1, 2],
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected failure');
    expect(result.error).toBe(
      'Eine Rallye kann höchstens eine Upload-Frage enthalten'
    );
    expect(supabase.rallyeInsert).not.toHaveBeenCalled();
    expect(supabase.joinInsert).not.toHaveBeenCalled();
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
      rallyeCode: '',
      questionIds: [],
    });

    expect(result.success).toBe(true);
    expect(supabase.rallyeInsert).toHaveBeenCalledWith(
      expect.objectContaining({ rallye_end: null })
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
      rallyeCode: '',
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
      rallyeCode: '',
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
      rallyeCode: '',
      questionIds: [],
    });
    expect(result.success).toBe(false);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});

describe('getRallyeCampusTourStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('treats a rallye referenced by multiple locations as a campus tour', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const limit = vi.fn().mockResolvedValue({
      data: [{ default_rallye_id: 7 }],
      error: null,
    });
    const eq = vi.fn(() => ({ limit }));
    const select = vi.fn(() => ({ eq }));
    mockCreateClient.mockResolvedValue({
      from: vi.fn(() => ({ select })),
    });

    const { getRallyeCampusTourStatus } = await import('./rallye');
    const result = await getRallyeCampusTourStatus(7);

    expect(result).toEqual({ success: true, data: true });
    expect(limit).toHaveBeenCalledWith(1);
  });
});

describe('getRallyeHasUploadQuestion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  const mockUploadRows = (rows: Array<{ question_id: number }>) => {
    const limit = vi.fn().mockResolvedValue({ data: rows, error: null });
    const typeEq = vi.fn(() => ({ limit }));
    const rallyeEq = vi.fn(() => ({ eq: typeEq }));
    mockCreateClient.mockResolvedValue({
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq: rallyeEq })) })),
    });
    return { rallyeEq, typeEq };
  };

  it('reports an assigned upload question', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const { rallyeEq, typeEq } = mockUploadRows([{ question_id: 3 }]);

    const { getRallyeHasUploadQuestion } = await import('./rallye');
    const result = await getRallyeHasUploadQuestion(7);

    expect(result).toEqual({ success: true, data: true });
    expect(rallyeEq).toHaveBeenCalledWith('rallye_id', 7);
    expect(typeEq).toHaveBeenCalledWith('questions.type', 'upload');
  });

  it('reports a rallye without upload question', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    mockUploadRows([]);

    const { getRallyeHasUploadQuestion } = await import('./rallye');
    const result = await getRallyeHasUploadQuestion(7);

    expect(result).toEqual({ success: true, data: false });
  });

  it('rejects an invalid id without touching Supabase', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const { getRallyeHasUploadQuestion } = await import('./rallye');
    const result = await getRallyeHasUploadQuestion(0);

    expect(result.success).toBe(false);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});

describe('deleteRallye', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  const makeSupabase = (opts: {
    uploadRows?: Array<{ answer: string | null }>;
    uploadError?: unknown;
    deleteError?: unknown;
    removeError?: unknown;
  }) => {
    const calls: string[] = [];
    const rallyeDeleteEq = vi.fn(async () => {
      calls.push('delete rallye');
      return { error: opts.deleteError ?? null };
    });
    const remove = vi.fn(async () => {
      calls.push('remove photos');
      return { data: [], error: opts.removeError ?? null };
    });
    const storageFrom = vi.fn(() => ({ remove }));
    const uploadTypeEq = vi.fn().mockResolvedValue({
      data: opts.uploadRows ?? [],
      error: opts.uploadError ?? null,
    });
    const from = vi.fn((table: string) => {
      if (table === 'team_answers') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ eq: uploadTypeEq })),
          })),
        };
      }
      // rallyes
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi
              .fn()
              .mockResolvedValue({ data: { id: 5 }, error: null }),
          })),
        })),
        delete: vi.fn(() => ({ eq: rallyeDeleteEq })),
      };
    });
    return {
      client: { from, storage: { from: storageFrom } },
      calls,
      remove,
      storageFrom,
    };
  };

  it('removes the upload photos of the rallye after deleting it', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase({
      uploadRows: [
        { answer: 'team-1/photo.jpg' },
        { answer: ' ' },
        { answer: null },
        { answer: 'team-2/photo.jpg' },
      ],
    });
    mockCreateClient.mockResolvedValue(supabase.client);

    const { deleteRallye } = await import('./rallye');
    const result = await deleteRallye('5');

    expect(result.success).toBe(true);
    expect(supabase.storageFrom).toHaveBeenCalledWith('upload-photos');
    expect(supabase.remove).toHaveBeenCalledWith([
      'team-1/photo.jpg',
      'team-2/photo.jpg',
    ]);
    expect(supabase.calls).toEqual(['delete rallye', 'remove photos']);
  });

  it('does not touch storage when the rallye has no upload photos', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase({ uploadRows: [] });
    mockCreateClient.mockResolvedValue(supabase.client);

    const { deleteRallye } = await import('./rallye');
    const result = await deleteRallye('5');

    expect(result.success).toBe(true);
    expect(supabase.remove).not.toHaveBeenCalled();
  });

  it('keeps the rallye when the upload photos cannot be loaded', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase({ uploadError: { message: 'boom' } });
    mockCreateClient.mockResolvedValue(supabase.client);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { deleteRallye } = await import('./rallye');
    const result = await deleteRallye('5');

    expect(result.success).toBe(false);
    expect(supabase.calls).toEqual([]);
  });

  it('keeps the photos when deleting the rallye fails', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase({
      uploadRows: [{ answer: 'team-1/photo.jpg' }],
      deleteError: { message: 'boom' },
    });
    mockCreateClient.mockResolvedValue(supabase.client);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { deleteRallye } = await import('./rallye');
    const result = await deleteRallye('5');

    expect(result.success).toBe(false);
    expect(supabase.remove).not.toHaveBeenCalled();
  });

  it('still reports success when removing the photos fails', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase({
      uploadRows: [{ answer: 'team-1/photo.jpg' }],
      removeError: { message: 'boom' },
    });
    mockCreateClient.mockResolvedValue(supabase.client);
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const { deleteRallye } = await import('./rallye');
    const result = await deleteRallye('5');

    expect(result.success).toBe(true);
    expect(consoleError).toHaveBeenCalledWith(
      'Error removing upload photos:',
      expect.anything()
    );
  });
});

describe('resetRallye', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  const makeSupabase = (opts: {
    rallye?: { id: number; status: string } | null;
    campusTourLocations?: Array<{ default_rallye_id: number }>;
    uploadRows?: Array<{ answer: string | null }>;
    uploadError?: unknown;
    rpcError?: unknown;
  }) => {
    const calls: string[] = [];
    const rpc = vi.fn(async () => {
      calls.push('reset rallye');
      return { data: null, error: opts.rpcError ?? null };
    });
    const remove = vi.fn(async () => {
      calls.push('remove photos');
      return { data: [], error: null };
    });
    const from = vi.fn((table: string) => {
      if (table === 'team_answers') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({
                data: opts.uploadRows ?? [],
                error: opts.uploadError ?? null,
              }),
            })),
          })),
        };
      }
      if (table === 'locations') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({
                data: opts.campusTourLocations ?? [],
                error: null,
              }),
            })),
          })),
        };
      }
      // rallyes
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data:
                opts.rallye === undefined
                  ? { id: 5, status: 'ended' }
                  : opts.rallye,
              error: null,
            }),
          })),
        })),
      };
    });
    return {
      client: { from, rpc, storage: { from: vi.fn(() => ({ remove })) } },
      calls,
      rpc,
      remove,
    };
  };

  it('resets the rallye and removes its upload photos afterwards', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase({
      uploadRows: [{ answer: 'team-1/photo.jpg' }],
    });
    mockCreateClient.mockResolvedValue(supabase.client);

    const { resetRallye } = await import('./rallye');
    const result = await resetRallye(5);

    expect(result.success).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('reset_rallye', {
      rallye_id_param: 5,
    });
    expect(supabase.remove).toHaveBeenCalledWith(['team-1/photo.jpg']);
    expect(supabase.calls).toEqual(['reset rallye', 'remove photos']);
  });

  it.each(['ready', 'running', 'voting', 'results', 'ended'])(
    'allows resetting a rallye in status %s',
    async (status) => {
      mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
      const supabase = makeSupabase({ rallye: { id: 5, status } });
      mockCreateClient.mockResolvedValue(supabase.client);

      const { resetRallye } = await import('./rallye');
      expect((await resetRallye(5)).success).toBe(true);
    }
  );

  it('rejects a draft', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase({ rallye: { id: 5, status: 'draft' } });
    mockCreateClient.mockResolvedValue(supabase.client);

    const { resetRallye } = await import('./rallye');
    const result = await resetRallye(5);

    expect(result.success).toBe(false);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('rejects a campus tour', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase({
      campusTourLocations: [{ default_rallye_id: 5 }],
    });
    mockCreateClient.mockResolvedValue(supabase.client);

    const { resetRallye } = await import('./rallye');
    const result = await resetRallye(5);

    expect(result.success).toBe(false);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('keeps the run data when the upload photos cannot be loaded', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase({ uploadError: { message: 'boom' } });
    mockCreateClient.mockResolvedValue(supabase.client);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { resetRallye } = await import('./rallye');
    const result = await resetRallye(5);

    expect(result.success).toBe(false);
    expect(supabase.calls).toEqual([]);
  });

  it('keeps the photos when the reset fails', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase({
      uploadRows: [{ answer: 'team-1/photo.jpg' }],
      rpcError: { message: 'boom' },
    });
    mockCreateClient.mockResolvedValue(supabase.client);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const { resetRallye } = await import('./rallye');
    const result = await resetRallye(5);

    expect(result.success).toBe(false);
    expect(supabase.remove).not.toHaveBeenCalled();
  });

  it('fails for unknown rallye', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase({ rallye: null });
    mockCreateClient.mockResolvedValue(supabase.client);

    const { resetRallye } = await import('./rallye');
    expect((await resetRallye(999)).success).toBe(false);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('rejects an invalid id without touching Supabase', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const { resetRallye } = await import('./rallye');
    expect((await resetRallye(0)).success).toBe(false);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});

describe('getRallyeRunDataSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('counts teams, team answers and upload photos of the rallye', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const from = vi.fn((table: string) => {
      if (table === 'teams') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ count: 3, error: null }),
          })),
        };
      }
      // team_answers: the count query filters once, the photo query twice
      return {
        select: vi.fn((columns: string) => ({
          eq: columns.includes('questions')
            ? vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: [{ answer: 'a.jpg' }, { answer: '' }],
                  error: null,
                }),
              }))
            : vi.fn().mockResolvedValue({ count: 7, error: null }),
        })),
      };
    });
    mockCreateClient.mockResolvedValue({ from });

    const { getRallyeRunDataSummary } = await import('./rallye');
    const result = await getRallyeRunDataSummary(5);

    expect(result).toEqual({
      success: true,
      data: { teamCount: 3, teamAnswerCount: 7, uploadPhotoCount: 1 },
    });
  });

  it('rejects an invalid id without touching Supabase', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const { getRallyeRunDataSummary } = await import('./rallye');
    expect((await getRallyeRunDataSummary(0)).success).toBe(false);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});
