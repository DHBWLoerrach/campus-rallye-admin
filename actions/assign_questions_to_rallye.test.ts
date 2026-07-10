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

describe('assignQuestionsToRallye', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('validates rallye id before touching Supabase', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const { assignQuestionsToRallye } =
      await import('./assign_questions_to_rallye');
    const result = await assignQuestionsToRallye(0, []);

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected validation to fail');
    }
    expect(result.error).toBe('Ungültige Rallye-ID');
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('validates question ids before touching Supabase', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const { assignQuestionsToRallye } =
      await import('./assign_questions_to_rallye');
    const result = await assignQuestionsToRallye(1, [-1]);

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected validation to fail');
    }
    expect(result.error).toBe('Ungültige Fragen');
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('rejects voting for non-upload questions', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'rallyes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: { id: 1 },
                  error: null,
                })),
              })),
            })),
          };
        }
        if (table === 'questions') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(async () => ({
                data: [{ id: 1, type: 'knowledge' }],
                error: null,
              })),
            })),
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    mockCreateClient.mockResolvedValue(supabase);

    const { assignQuestionsToRallye } =
      await import('./assign_questions_to_rallye');
    const result = await assignQuestionsToRallye(1, [1], [1]);

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected validation to fail');
    }
    expect(result.error).toBe('Abstimmung nur für Upload-Fragen möglich');
  });

  it('stores upload voting flags when adding assignments', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const insert = vi.fn(async () => ({ error: null }));

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'rallyes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: { id: 1 },
                  error: null,
                })),
              })),
            })),
          };
        }
        if (table === 'questions') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(async () => ({
                data: [{ id: 10, type: 'upload' }],
                error: null,
              })),
            })),
          };
        }
        if (table === 'rallye_questions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(async () => ({ data: [], error: null })),
            })),
            insert,
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    mockCreateClient.mockResolvedValue(supabase);

    const { assignQuestionsToRallye } =
      await import('./assign_questions_to_rallye');
    const result = await assignQuestionsToRallye(1, [10], [10]);

    expect(result.success).toBe(true);
    expect(insert).toHaveBeenCalledWith([
      { rallye_id: 1, question_id: 10, is_voting: true },
    ]);
  });

  it('does not update unchanged voting flags for kept assignments', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const update = vi.fn();

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'rallyes') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: { id: 1 },
                  error: null,
                })),
              })),
            })),
          };
        }
        if (table === 'questions') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(async () => ({
                data: [{ id: 10, type: 'upload' }],
                error: null,
              })),
            })),
          };
        }
        if (table === 'rallye_questions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(async () => ({
                data: [{ question_id: 10, is_voting: false }],
                error: null,
              })),
            })),
            insert: vi.fn(),
            delete: vi.fn(),
            update,
          };
        }
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    mockCreateClient.mockResolvedValue(supabase);

    const { assignQuestionsToRallye } =
      await import('./assign_questions_to_rallye');
    const result = await assignQuestionsToRallye(1, [10], []);

    expect(result.success).toBe(true);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('getRallyeQuestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('validates rallye id before touching Supabase', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const { getRallyeQuestions } = await import('./assign_questions_to_rallye');
    const result = await getRallyeQuestions(0);

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected validation to fail');
    }
    expect(result.error).toBe('Ungültige Rallye-ID');
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});

describe('getVotingQuestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('validates rallye id before touching Supabase', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const { getVotingQuestions } = await import('./assign_questions_to_rallye');
    const result = await getVotingQuestions(0);

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected validation to fail');
    }
    expect(result.error).toBe('Ungültige Rallye-ID');
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});

describe('addQuestionToRallye', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  // Supabase mock: rallye lookup, question lookup, existing-join lookup, insert
  const makeSupabase = (opts: {
    rallyeExists?: boolean;
    questionType?: string | null;
    alreadyAssigned?: boolean;
    insertError?: unknown;
  }) => {
    const insert = vi
      .fn()
      .mockResolvedValue({ error: opts.insertError ?? null });
    const from = vi.fn((table: string) => {
      if (table === 'rallyes') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: opts.rallyeExists === false ? null : { id: 5 },
                error: null,
              }),
            })),
          })),
        };
      }
      if (table === 'questions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data:
                  opts.questionType === null
                    ? null
                    : { id: 7, type: opts.questionType ?? 'knowledge' },
                error: null,
              }),
            })),
          })),
        };
      }
      // rallye_questions
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: opts.alreadyAssigned ? { question_id: 7 } : null,
                error: null,
              }),
            })),
          })),
        })),
        insert,
      };
    });
    return { from, insert };
  };

  it('inserts a new assignment with voting disabled', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase({});
    mockCreateClient.mockResolvedValue(supabase);

    const { addQuestionToRallye } =
      await import('./assign_questions_to_rallye');
    const result = await addQuestionToRallye(5, 7);

    expect(result.success).toBe(true);
    expect(supabase.insert).toHaveBeenCalledWith({
      rallye_id: 5,
      question_id: 7,
      is_voting: false,
    });
  });

  it('is idempotent when the question is already assigned', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase({ alreadyAssigned: true });
    mockCreateClient.mockResolvedValue(supabase);

    const { addQuestionToRallye } =
      await import('./assign_questions_to_rallye');
    const result = await addQuestionToRallye(5, 7);

    expect(result.success).toBe(true);
    expect(supabase.insert).not.toHaveBeenCalled();
  });

  it('fails when the question does not exist', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    mockCreateClient.mockResolvedValue(makeSupabase({ questionType: null }));

    const { addQuestionToRallye } =
      await import('./assign_questions_to_rallye');
    const result = await addQuestionToRallye(5, 999);
    expect(result.success).toBe(false);
  });

  it('rejects invalid ids without touching Supabase', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const { addQuestionToRallye } =
      await import('./assign_questions_to_rallye');
    expect((await addQuestionToRallye(-1, 7)).success).toBe(false);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});

describe('removeQuestionFromRallye', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('deletes the join row', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const deleteEq2 = vi.fn().mockResolvedValue({ error: null });
    const deleteEq1 = vi.fn(() => ({ eq: deleteEq2 }));
    const deleteFn = vi.fn(() => ({ eq: deleteEq1 }));
    mockCreateClient.mockResolvedValue({
      from: vi.fn(() => ({ delete: deleteFn })),
    });

    const { removeQuestionFromRallye } =
      await import('./assign_questions_to_rallye');
    const result = await removeQuestionFromRallye(5, 7);

    expect(result.success).toBe(true);
    expect(deleteFn).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith('/rallyes/5', 'layout');
  });

  it('rejects invalid ids', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const { removeQuestionFromRallye } =
      await import('./assign_questions_to_rallye');
    expect((await removeQuestionFromRallye(5, 0)).success).toBe(false);
  });
});

describe('setQuestionVoting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  const makeSupabase = (opts: {
    questionType?: string | null;
    rowUpdated?: boolean;
  }) => {
    const updatedRows = opts.rowUpdated === false ? [] : [{ question_id: 7 }];
    const updateSelect = vi
      .fn()
      .mockResolvedValue({ data: updatedRows, error: null });
    const updateEq2 = vi.fn(() => ({ select: updateSelect }));
    const updateEq1 = vi.fn(() => ({ eq: updateEq2 }));
    const update = vi.fn(() => ({ eq: updateEq1 }));
    const from = vi.fn((table: string) => {
      if (table === 'questions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data:
                  opts.questionType === null
                    ? null
                    : { id: 7, type: opts.questionType ?? 'upload' },
                error: null,
              }),
            })),
          })),
        };
      }
      return { update };
    });
    return { from, update };
  };

  it('enables voting for an assigned upload question', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase({ questionType: 'upload' });
    mockCreateClient.mockResolvedValue(supabase);

    const { setQuestionVoting } = await import('./assign_questions_to_rallye');
    const result = await setQuestionVoting(5, 7, true);

    expect(result.success).toBe(true);
    expect(supabase.update).toHaveBeenCalledWith({ is_voting: true });
  });

  it('rejects enabling voting for non-upload questions', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    mockCreateClient.mockResolvedValue(
      makeSupabase({ questionType: 'knowledge' })
    );

    const { setQuestionVoting } = await import('./assign_questions_to_rallye');
    const result = await setQuestionVoting(5, 7, true);

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected failure');
    expect(result.error).toBe('Abstimmung nur für Upload-Fragen möglich');
  });

  it('fails when the question is not assigned to the rallye', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    mockCreateClient.mockResolvedValue(
      makeSupabase({ questionType: 'upload', rowUpdated: false })
    );

    const { setQuestionVoting } = await import('./assign_questions_to_rallye');
    const result = await setQuestionVoting(5, 7, true);
    expect(result.success).toBe(false);
  });

  it('disables voting without checking the question type', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const supabase = makeSupabase({});
    mockCreateClient.mockResolvedValue(supabase);

    const { setQuestionVoting } = await import('./assign_questions_to_rallye');
    const result = await setQuestionVoting(5, 7, false);

    expect(result.success).toBe(true);
    expect(supabase.update).toHaveBeenCalledWith({ is_voting: false });
  });
});
