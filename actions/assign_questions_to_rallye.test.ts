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
        if (table === 'rallye') {
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
        if (table === 'rallye') {
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
        if (table === 'join_rallye_questions') {
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
        if (table === 'rallye') {
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
        if (table === 'join_rallye_questions') {
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
