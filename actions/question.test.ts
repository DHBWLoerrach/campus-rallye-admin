import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockRequireProfile,
  mockCreateClient,
  mockDeleteImage,
  mockAssignRallyesToQuestion,
} = vi.hoisted(() => ({
  mockRequireProfile: vi.fn(),
  mockCreateClient: vi.fn(),
  mockDeleteImage: vi.fn(),
  mockAssignRallyesToQuestion: vi.fn(),
}));

vi.mock('@/lib/require-profile', () => ({
  requireProfile: mockRequireProfile,
}));

vi.mock('@/lib/supabase', () => ({
  default: mockCreateClient,
}));

vi.mock('@/actions/upload', () => ({
  deleteImage: mockDeleteImage,
}));

vi.mock('@/actions/assign_questions_to_rallye', () => ({
  assignRallyesToQuestion: mockAssignRallyesToQuestion,
}));

describe('question write actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  const buildCreateClient = (answersError: Error | null = null) => {
    const questionDeleteEq = vi.fn().mockResolvedValue({ error: null });
    const questionsQuery = {
      insert: vi.fn(() => ({
        select: vi.fn().mockResolvedValue({
          data: [{ id: 42 }],
          error: null,
        }),
      })),
      delete: vi.fn(() => ({ eq: questionDeleteEq })),
    };
    const answersQuery = {
      insert: vi.fn().mockResolvedValue({ error: answersError }),
    };
    const from = vi.fn((table: string) => {
      if (table === 'questions') return questionsQuery;
      if (table === 'solution_options') return answersQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    mockCreateClient.mockResolvedValue({ from });
    return { questionDeleteEq };
  };

  it('returns validation errors before touching Supabase', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const { createQuestion } = await import('./question');

    const result = await createQuestion({
      content: '',
      type: 'knowledge',
      point_value: 1,
      solutionOptions: [{ correct: true, text: 'Antwort' }],
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
      point_value: -1,
      solutionOptions: [{ id: 1, correct: true, text: 'Antwort' }],
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected validation to fail');
    }
    expect(result.error).toBe('Ungültige Eingaben');
    expect(result.issues?.point_value).toBe(
      'Punkte müssen größer oder gleich 0 sein'
    );
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('clears stored points when update omits point_value', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const questionUpdate = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }));
    const questionsQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 1 },
            error: null,
          }),
        })),
      })),
      update: questionUpdate,
    };
    const answersQuery = {
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({
          data: [{ id: 1 }],
          error: null,
        }),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      })),
    };
    const from = vi.fn((table: string) => {
      if (table === 'questions') return questionsQuery;
      if (table === 'solution_options') return answersQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    mockCreateClient.mockResolvedValue({ from });

    const { updateQuestion } = await import('./question');
    const result = await updateQuestion(1, {
      content: 'Frage',
      type: 'knowledge',
      solutionOptions: [{ id: 1, correct: true, text: 'Antwort' }],
    });

    expect(result.success).toBe(true);
    expect(questionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ point_value: null })
    );
  });

  it('removes the inserted question when saving answers fails', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const { questionDeleteEq } = buildCreateClient(new Error('Answer failed'));

    const { createQuestion } = await import('./question');
    const result = await createQuestion({
      content: 'Frage',
      type: 'knowledge',
      solutionOptions: [{ correct: true, text: 'Antwort' }],
    });

    expect(result.success).toBe(false);
    expect(questionDeleteEq).toHaveBeenCalledWith('id', 42);
  });

  it('removes the inserted question when rallye assignment fails', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const { questionDeleteEq } = buildCreateClient();
    mockAssignRallyesToQuestion.mockResolvedValue({
      success: false,
      error: 'Rallye nicht gefunden',
    });

    const { createQuestion } = await import('./question');
    const result = await createQuestion({
      content: 'Frage',
      type: 'knowledge',
      solutionOptions: [{ correct: true, text: 'Antwort' }],
      rallyeIds: [5],
    });

    expect(result.success).toBe(false);
    expect(mockAssignRallyesToQuestion).toHaveBeenCalledWith(42, [5]);
    expect(questionDeleteEq).toHaveBeenCalledWith('id', 42);
  });

  it('createQuestion requires a profile before touching Supabase', async () => {
    mockRequireProfile.mockRejectedValue(new Error('Denied'));

    const { createQuestion } = await import('./question');

    await expect(
      createQuestion({
        content: 'Question',
        type: 'knowledge',
        point_value: 1,
        hint: 'Hint',
        category: 'Category',
        solutionOptions: [{ correct: true, text: 'Answer' }],
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
        solutionOptions: [{ id: 1, correct: true, text: 'Answer' }],
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

describe('deleteQuestion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  const buildDeleteQuery = () => ({
    delete: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })),
  });

  it('deletes the stored image when a bucket path exists', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    mockDeleteImage.mockResolvedValue({
      success: true,
      data: { message: 'Bild gelöscht' },
    });

    const questionSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 12,
            bucket_path: '123e4567-e89b-12d3-a456-426614174000.png',
          },
          error: null,
        }),
      })),
    }));
    const questionsQuery = {
      select: questionSelect,
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    };
    const answersQuery = buildDeleteQuery();

    const from = vi.fn((table: string) => {
      if (table === 'questions') return questionsQuery;
      if (table === 'solution_options') return answersQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    mockCreateClient.mockResolvedValue({ from });

    const { deleteQuestion } = await import('./question');
    const result = await deleteQuestion(12);

    expect(result.success).toBe(true);
    expect(questionSelect).toHaveBeenCalledWith('id, bucket_path');
    expect(mockDeleteImage).toHaveBeenCalledWith(
      '123e4567-e89b-12d3-a456-426614174000.png'
    );
  });

  it('skips image deletion when no bucket path is stored', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const questionSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 15, bucket_path: null },
          error: null,
        }),
      })),
    }));
    const questionsQuery = {
      select: questionSelect,
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    };
    const answersQuery = buildDeleteQuery();

    const from = vi.fn((table: string) => {
      if (table === 'questions') return questionsQuery;
      if (table === 'solution_options') return answersQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    mockCreateClient.mockResolvedValue({ from });

    const { deleteQuestion } = await import('./question');
    const result = await deleteQuestion(15);

    expect(result.success).toBe(true);
    expect(questionSelect).toHaveBeenCalledWith('id, bucket_path');
    expect(mockDeleteImage).not.toHaveBeenCalled();
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
      then: (
        resolve: (value: unknown) => unknown,
        reject: (reason?: unknown) => unknown
      ) => Promise.resolve(response).then(resolve, reject),
    };

    return query;
  };

  it('searches question and answer text with one term', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const questionIdsQuery = makeQuery({
      data: [{ id: 7 }],
      error: null,
    });
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
          point_value: 2,
          hint: null,
          category: 'Allgemein',
          bucket_path: null,
          solutionOptions: [],
        },
      ],
      error: null,
    };
    const questionsQuery = makeQuery(questionsResponse);

    let questionQueryCount = 0;
    const from = vi.fn((table: string) => {
      if (table === 'solution_options') return answersQuery;
      if (table === 'questions') {
        questionQueryCount += 1;
        return questionQueryCount === 1 ? questionIdsQuery : questionsQuery;
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    mockCreateClient.mockResolvedValue({ from });

    const { getQuestions } = await import('./question');
    const result = await getQuestions({ search: 'Campus' });

    expect(result).toEqual({ success: true, data: questionsResponse.data });
    expect(questionIdsQuery.select).toHaveBeenCalledWith('id');
    expect(questionIdsQuery.ilike).toHaveBeenCalledWith('content', '%Campus%');
    expect(questionsQuery.select).toHaveBeenCalledWith(
      'id, content, type, point_value, hint, category, bucket_path, solutionOptions:solution_options(id, correct, text)'
    );
    expect(answersQuery.select).toHaveBeenCalledWith('question_id');
    expect(answersQuery.ilike).toHaveBeenCalledWith('text', '%Campus%');
    expect(questionsQuery.in).toHaveBeenCalledWith('id', [7, 42]);
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
      then: (
        resolve: (value: unknown) => unknown,
        reject: (reason?: unknown) => unknown
      ) => Promise.resolve(response).then(resolve, reject),
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
    expect(errorSpy).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it('filters empty categories and returns unique values', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const query = makeQuery({
      data: [
        { category: 'Allgemein' },
        { category: null },
        { category: ' ' },
        { category: 'Allgemein' },
        { category: 'Sport' },
      ],
      error: null,
    });
    const from = vi.fn(() => query);

    mockCreateClient.mockResolvedValue({ from });

    const { getCategories } = await import('./question');
    const result = await getCategories();

    expect(result).toEqual({
      success: true,
      data: ['Allgemein', 'Sport'],
    });
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
    expect(errorSpy).toHaveBeenCalledWith(
      'Error fetching categories:',
      expect.any(Error)
    );

    errorSpy.mockRestore();
  });
});
