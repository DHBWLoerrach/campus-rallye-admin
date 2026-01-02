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

  it('returns validation errors before touching Supabase', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const { createQuestion } = await import('./question');

    const result = await createQuestion({
      content: '',
      type: 'knowledge',
      points: 1,
      answers: [{ correct: true, text: 'Antwort' }],
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected validation to fail');
    }
    expect(result.error).toBe('Ungültige Eingaben');
    expect(result.issues?.content).toBe('Bitte geben Sie eine Frage ein');
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('validates points on update before touching Supabase', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const { updateQuestion } = await import('./question');

    const result = await updateQuestion(1, {
      content: 'Frage',
      type: 'knowledge',
      points: -1,
      answers: [{ id: 1, correct: true, text: 'Antwort' }],
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected validation to fail');
    }
    expect(result.error).toBe('Ungültige Eingaben');
    expect(result.issues?.points).toBe('Punkte müssen größer oder gleich 0 sein');
    expect(mockCreateClient).not.toHaveBeenCalled();
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

describe('getQuestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  const makeQuery = (response: { data: unknown; error: unknown }) => {
    const query = {
      select: vi.fn(() => query),
      ilike: vi.fn(() => query),
      eq: vi.fn(() => query),
      in: vi.fn(() => query),
      order: vi.fn(() => query),
      then: (resolve: (value: unknown) => unknown, reject: (reason?: unknown) => unknown) =>
        Promise.resolve(response).then(resolve, reject),
    };

    return query;
  };

  it('filters by answer text when answer ids are numbers', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const answersQuery = makeQuery({
      data: [{ question_id: 42 }],
      error: null,
    });
    const questionsResponse = {
      data: [
        {
          id: 42,
          content: 'Question',
          type: 'multiple_choice',
          points: 2,
          hint: null,
          category: 'Allgemein',
          bucket_path: null,
          answers: [],
        },
      ],
      error: null,
    };
    const questionsQuery = makeQuery(questionsResponse);

    const from = vi.fn((table: string) => {
      if (table === 'answers') return answersQuery;
      if (table === 'questions') return questionsQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    mockCreateClient.mockResolvedValue({ from });

    const { getQuestions } = await import('./question');
    const result = await getQuestions({ answer: 'Antwort' });

    expect(result).toEqual({ success: true, data: questionsResponse.data });
    expect(answersQuery.select).toHaveBeenCalledWith('question_id');
    expect(answersQuery.ilike).toHaveBeenCalledWith('text', '%Antwort%');
    expect(questionsQuery.in).toHaveBeenCalledWith('id', [42]);
  });
});

describe('getCategories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  const makeQuery = (response: { data: unknown; error: unknown }) => {
    const query = {
      select: vi.fn(() => query),
      not: vi.fn(() => query),
      then: (resolve: (value: unknown) => unknown, reject: (reason?: unknown) => unknown) =>
        Promise.resolve(response).then(resolve, reject),
    };

    return query;
  };

  it('returns empty array without logging an error when no categories exist', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const query = makeQuery({ data: [], error: null });
    const from = vi.fn(() => query);

    mockCreateClient.mockResolvedValue({ from });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { getCategories } = await import('./question');
    const result = await getCategories();

    expect(result).toEqual({ success: true, data: [] });
    expect(from).toHaveBeenCalledWith('questions');
    expect(query.select).toHaveBeenCalledWith('category');
    expect(query.not).toHaveBeenCalledWith('category', 'is', null);
    expect(errorSpy).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it('logs and returns empty array when fetching categories fails', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const query = makeQuery({ data: null, error: new Error('Boom') });
    const from = vi.fn(() => query);

    mockCreateClient.mockResolvedValue({ from });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { getCategories } = await import('./question');
    const result = await getCategories();

    expect(result.success).toBe(false);
    expect(from).toHaveBeenCalledWith('questions');
    expect(query.select).toHaveBeenCalledWith('category');
    expect(query.not).toHaveBeenCalledWith('category', 'is', null);
    expect(errorSpy).toHaveBeenCalledWith(
      'Error fetching categories:',
      expect.any(Error)
    );

    errorSpy.mockRestore();
  });
});
