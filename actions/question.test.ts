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

describe('question write actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('createQuestion requires a profile before touching Supabase', async () => {
    mockRequireProfile.mockRejectedValue(new Error('Denied'));

    const { createQuestion } = await import('./question');

    await expect(
      createQuestion({
        content: 'Question',
        type: 'knowledge',
        points: 1,
        hint: 'Hint',
        category: 'Category',
        answers: [{ correct: true, text: 'Answer' }],
      })
    ).rejects.toThrow('Denied');

    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('updateQuestion requires a profile before touching Supabase', async () => {
    mockRequireProfile.mockRejectedValue(new Error('Denied'));

    const { updateQuestion } = await import('./question');

    await expect(
      updateQuestion(1, {
        content: 'Question',
        type: 'knowledge',
        answers: [{ id: 1, correct: true, text: 'Answer' }],
      })
    ).rejects.toThrow('Denied');

    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('deleteQuestion requires a profile before touching Supabase', async () => {
    mockRequireProfile.mockRejectedValue(new Error('Denied'));

    const { deleteQuestion } = await import('./question');

    await expect(deleteQuestion(1)).rejects.toThrow('Denied');

    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});
