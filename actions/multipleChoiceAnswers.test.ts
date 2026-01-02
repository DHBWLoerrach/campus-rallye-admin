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

describe('getChildren', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('validates parent id before touching Supabase', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const { getChildren } = await import('./multipleChoiceAnswers');
    const result = await getChildren(0);

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected validation to fail');
    }
    expect(result.error).toBe('Ungültige Frage-ID');
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});

describe('saveQuestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('rejects non-multiple choice parents before touching Supabase', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const { saveQuestions } = await import('./multipleChoiceAnswers');
    const result = await saveQuestions([], {
      id: 1,
      question_type: 'knowledge',
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected validation to fail');
    }
    expect(result.error).toBe('Ungültiger Fragetyp');
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});
