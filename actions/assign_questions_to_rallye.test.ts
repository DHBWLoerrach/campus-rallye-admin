import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRequireProfile, mockCreateClient } = vi.hoisted(() => ({
  mockRequireProfile: vi.fn(),
  mockCreateClient: vi.fn(),
}));

vi.mock('@/lib/require-profile', () => ({
  requireProfile: mockRequireProfile,
}));

vi.mock('@/lib/supabase', () => ({
  default: mockCreateClient,
}));

describe('assignQuestionsToRallye', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('validates rallye id before touching Supabase', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const { assignQuestionsToRallye } = await import('./assign_questions_to_rallye');
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

    const { assignQuestionsToRallye } = await import('./assign_questions_to_rallye');
    const result = await assignQuestionsToRallye(1, [-1]);

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected validation to fail');
    }
    expect(result.error).toBe('Ungültige Fragen');
    expect(mockCreateClient).not.toHaveBeenCalled();
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
