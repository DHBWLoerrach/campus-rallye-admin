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

const QUESTION_SELECT =
  'id, content, type, point_value, hint, category, bucket_path, solutionOptions:solution_options(id, correct, text), geocaching:geocaching_questions(target_latitude, target_longitude, proximity_radius, input_type)';

describe('question write actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  const buildCreateClient = ({
    answersError = null,
    geocachingError = null,
    order = [],
  }: {
    answersError?: Error | null;
    geocachingError?: Error | null;
    order?: string[];
  } = {}) => {
    const questionDeleteEq = vi.fn().mockResolvedValue({ error: null });
    const questionInsert = vi.fn(() => {
      order.push('question');
      return {
        select: vi.fn().mockResolvedValue({
          data: [{ id: 42 }],
          error: null,
        }),
      };
    });
    const questionsQuery = {
      insert: questionInsert,
      delete: vi.fn(() => ({ eq: questionDeleteEq })),
    };
    const answersQuery = {
      insert: vi.fn(() => {
        order.push('solutions');
        return Promise.resolve({ error: answersError });
      }),
    };
    const geocachingInsert = vi.fn(() => {
      order.push('geocaching');
      return Promise.resolve({ error: geocachingError });
    });
    const geocachingQuery = {
      insert: geocachingInsert,
    };
    const from = vi.fn((table: string) => {
      if (table === 'questions') return questionsQuery;
      if (table === 'solution_options') return answersQuery;
      if (table === 'geocaching_questions') return geocachingQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    mockCreateClient.mockResolvedValue({ from });
    return {
      answersQuery,
      from,
      geocachingInsert,
      order,
      questionDeleteEq,
    };
  };

  const buildUpdateClient = ({
    existingType = 'knowledge',
    geocachingError = null,
    order = [],
  }: {
    existingType?: string;
    geocachingError?: Error | null;
    order?: string[];
  } = {}) => {
    const questionUpdate = vi.fn(() => {
      order.push('question');
      return { eq: vi.fn().mockResolvedValue({ error: null }) };
    });
    const questionsQuery = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 1, type: existingType },
            error: null,
          }),
        })),
      })),
      update: questionUpdate,
    };
    const answerUpdate = vi.fn(() => {
      order.push('solutions');
      return {
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      };
    });
    const answersQuery = {
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
      })),
      update: answerUpdate,
      insert: vi.fn(() => {
        order.push('solutions');
        return Promise.resolve({ error: null });
      }),
      delete: vi.fn(() => ({
        in: vi.fn().mockResolvedValue({ error: null }),
      })),
    };
    const geocachingUpsert = vi.fn(() => {
      order.push('geocaching');
      return Promise.resolve({ error: geocachingError });
    });
    const geocachingQuery = { upsert: geocachingUpsert };
    const from = vi.fn((table: string) => {
      if (table === 'questions') return questionsQuery;
      if (table === 'solution_options') return answersQuery;
      if (table === 'geocaching_questions') return geocachingQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    mockCreateClient.mockResolvedValue({ from });
    return {
      answersQuery,
      from,
      geocachingUpsert,
      order,
      questionUpdate,
      questionsQuery,
    };
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
    expect(result.issues?.content).toBe('Bitte eine Frage eingeben');
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it.each([
    {
      field: 'target_latitude',
      issue: 'geocaching.target_latitude',
      message: 'Bitte einen gültigen Breitengrad eingeben',
    },
    {
      field: 'target_longitude',
      issue: 'geocaching.target_longitude',
      message: 'Bitte einen gültigen Längengrad eingeben',
    },
    {
      field: 'proximity_radius',
      issue: 'geocaching.proximity_radius',
      message: 'Bitte einen gültigen Näherungsradius eingeben',
      invalidValue: Number.NaN,
    },
    {
      field: 'input_type',
      issue: 'geocaching.input_type',
      message: 'Bitte Text oder QR-Code als Eingabeart wählen',
      invalidValue: 'barcode',
    },
  ] as const)(
    'returns a neutral validation message for $field',
    async ({ field, issue, message, invalidValue = Number.NaN }) => {
      mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

      const { createQuestion } = await import('./question');
      const geocaching = {
        target_latitude: 47.615123,
        target_longitude: 7.664321,
        proximity_radius: 10,
        input_type: 'text' as const,
        [field]: invalidValue,
      };

      // Exercise the runtime boundary with invalid external input.
      const result = await createQuestion({
        content: 'Finde den Eingang',
        type: 'geocaching',
        geocaching: geocaching as Parameters<
          typeof createQuestion
        >[0]['geocaching'],
        solutionOptions: [{ correct: true, text: 'Eingang' }],
      });

      expect(result.success).toBe(false);
      if (result.success) {
        throw new Error('Expected validation to fail');
      }
      expect(result.issues?.[issue]).toBe(message);
      expect(mockCreateClient).not.toHaveBeenCalled();
    }
  );

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
    const { from, questionUpdate } = buildUpdateClient();

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
    expect(from).not.toHaveBeenCalledWith('geocaching_questions');
  });

  it('removes the inserted question when saving answers fails', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const { questionDeleteEq } = buildCreateClient({
      answersError: new Error('Answer failed'),
    });

    const { createQuestion } = await import('./question');
    const result = await createQuestion({
      content: 'Frage',
      type: 'knowledge',
      solutionOptions: [{ correct: true, text: 'Antwort' }],
    });

    expect(result.success).toBe(false);
    expect(questionDeleteEq).toHaveBeenCalledWith('id', 42);
  });

  it('creates text geocaching data with the validated radius default', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const { geocachingInsert } = buildCreateClient();

    const { createQuestion } = await import('./question');
    const result = await createQuestion({
      content: 'Finde den Eingang',
      type: 'geocaching',
      geocaching: {
        target_latitude: 47.615123,
        target_longitude: 7.664321,
        input_type: 'text',
      },
      solutionOptions: [{ correct: true, text: 'Eingang' }],
    });

    expect(result.success).toBe(true);
    expect(geocachingInsert).toHaveBeenCalledWith({
      question_id: 42,
      target_latitude: 47.615123,
      target_longitude: 7.664321,
      proximity_radius: 10,
      input_type: 'text',
    });
  });

  it('creates QR geocaching data before assigning rallyes', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const order: string[] = [];
    const { geocachingInsert } = buildCreateClient({ order });
    mockAssignRallyesToQuestion.mockImplementation(() => {
      order.push('assignments');
      return Promise.resolve({ success: true, data: undefined });
    });

    const { createQuestion } = await import('./question');
    const result = await createQuestion({
      content: 'Scanne den Code',
      type: 'geocaching',
      geocaching: {
        target_latitude: 47.615123,
        target_longitude: 7.664321,
        proximity_radius: 20,
        input_type: 'qr',
      },
      solutionOptions: [{ correct: true, text: 'CACHE-42' }],
      rallyeIds: [5],
    });

    expect(result.success).toBe(true);
    expect(geocachingInsert).toHaveBeenCalledWith(
      expect.objectContaining({ input_type: 'qr' })
    );
    expect(order).toEqual([
      'question',
      'solutions',
      'geocaching',
      'assignments',
    ]);
  });

  it('rolls back and skips assignments when geocaching creation fails', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const { questionDeleteEq } = buildCreateClient({
      geocachingError: new Error('Geocaching failed'),
    });

    const { createQuestion } = await import('./question');
    const result = await createQuestion({
      content: 'Finde den Eingang',
      type: 'geocaching',
      geocaching: {
        target_latitude: 47.615123,
        target_longitude: 7.664321,
        proximity_radius: 10,
        input_type: 'text',
      },
      solutionOptions: [{ correct: true, text: 'Eingang' }],
      rallyeIds: [5],
    });

    expect(result).toEqual({
      success: false,
      error: 'Geocaching-Daten konnten nicht gespeichert werden',
    });
    expect(questionDeleteEq).toHaveBeenCalledWith('id', 42);
    expect(mockAssignRallyesToQuestion).not.toHaveBeenCalled();
  });

  it('removes the inserted question when rallye assignment fails', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const { from, questionDeleteEq } = buildCreateClient();
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
    expect(from).not.toHaveBeenCalledWith('geocaching_questions');
  });

  it('upserts geocaching data before updating rallye assignments', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const order: string[] = [];
    const { geocachingUpsert } = buildUpdateClient({
      existingType: 'geocaching',
      order,
    });
    mockAssignRallyesToQuestion.mockImplementation(() => {
      order.push('assignments');
      return Promise.resolve({ success: true, data: undefined });
    });

    const { updateQuestion } = await import('./question');
    const result = await updateQuestion(1, {
      content: 'Finde den Eingang',
      type: 'geocaching',
      geocaching: {
        target_latitude: 47.615123,
        target_longitude: 7.664321,
        proximity_radius: 25,
        input_type: 'qr',
      },
      solutionOptions: [{ id: 1, correct: true, text: 'CACHE-1' }],
      rallyeIds: [5],
    });

    expect(result.success).toBe(true);
    expect(geocachingUpsert).toHaveBeenCalledWith(
      {
        question_id: 1,
        target_latitude: 47.615123,
        target_longitude: 7.664321,
        proximity_radius: 25,
        input_type: 'qr',
      },
      { onConflict: 'question_id' }
    );
    expect(order).toEqual([
      'question',
      'solutions',
      'geocaching',
      'assignments',
    ]);
  });

  it('returns a failure and skips assignments when geocaching upsert fails', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    buildUpdateClient({
      existingType: 'geocaching',
      geocachingError: new Error('Upsert failed'),
    });

    const { updateQuestion } = await import('./question');
    const result = await updateQuestion(1, {
      content: 'Finde den Eingang',
      type: 'geocaching',
      geocaching: {
        target_latitude: 47.615123,
        target_longitude: 7.664321,
        proximity_radius: 10,
        input_type: 'text',
      },
      solutionOptions: [{ id: 1, correct: true, text: 'Eingang' }],
      rallyeIds: [5],
    });

    expect(result).toEqual({
      success: false,
      error: 'Geocaching-Daten konnten nicht gespeichert werden',
    });
    expect(mockAssignRallyesToQuestion).not.toHaveBeenCalled();
  });

  it('rejects a crafted question type change before mutation', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const { answersQuery, questionUpdate, questionsQuery } = buildUpdateClient({
      existingType: 'picture',
    });

    const { updateQuestion } = await import('./question');
    const result = await updateQuestion(1, {
      content: 'Neue Wissensfrage',
      type: 'knowledge',
      solutionOptions: [{ id: 1, correct: true, text: 'Antwort' }],
    });

    expect(result).toEqual({
      success: false,
      error: 'Die Aufgabenart kann nicht geändert werden',
    });
    expect(questionsQuery.select).toHaveBeenCalledWith('id, type');
    expect(questionUpdate).not.toHaveBeenCalled();
    expect(answersQuery.select).not.toHaveBeenCalled();
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

describe('getQuestionById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
  });

  const configureQuestionResponse = (data: unknown) => {
    const maybeSingle = vi.fn().mockResolvedValue({ data, error: null });
    const select = vi.fn(() => ({
      eq: vi.fn(() => ({ maybeSingle })),
    }));
    const from = vi.fn((table: string) => {
      if (table === 'questions') return { select };
      throw new Error(`Unexpected table: ${table}`);
    });
    mockCreateClient.mockResolvedValue({ from });
    return { select };
  };

  it.each([
    {
      relationship: {
        target_latitude: 47.615123,
        target_longitude: 7.664321,
        proximity_radius: 10,
        input_type: 'text',
      },
      expected: {
        target_latitude: 47.615123,
        target_longitude: 7.664321,
        proximity_radius: 10,
        input_type: 'text',
      },
      shape: 'object',
    },
    {
      relationship: [
        {
          target_latitude: 47.615123,
          target_longitude: 7.664321,
          proximity_radius: 10,
          input_type: 'text',
        },
      ],
      expected: {
        target_latitude: 47.615123,
        target_longitude: 7.664321,
        proximity_radius: 10,
        input_type: 'text',
      },
      shape: 'one-element array',
    },
    { relationship: [], expected: null, shape: 'empty array' },
    { relationship: null, expected: null, shape: 'null' },
  ])('normalizes a $shape geocaching relationship', async (testCase) => {
    const select = configureQuestionResponse({
      id: 9,
      content: 'Finde den Eingang',
      type: 'geocaching',
      point_value: 3,
      hint: null,
      category: null,
      bucket_path: null,
      solutionOptions: [{ id: 2, correct: true, text: 'Eingang' }],
      geocaching: testCase.relationship,
    }).select;

    const { getQuestionById } = await import('./question');
    const result = await getQuestionById(9);

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error('Expected question loading to succeed');
    }
    expect(result.data?.type).toBe('geocaching');
    expect(result.data?.geocaching).toEqual(testCase.expected);
    expect(select).toHaveBeenCalledWith(QUESTION_SELECT);
  });

  it('rejects an unknown database question type', async () => {
    configureQuestionResponse({
      id: 9,
      content: 'Unknown question',
      type: 'future_type',
      solutionOptions: [],
      geocaching: null,
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { getQuestionById } = await import('./question');
    const result = await getQuestionById(9);

    expect(result).toEqual({
      success: false,
      error: 'Frage konnte nicht geladen werden',
    });
    expect(errorSpy).toHaveBeenCalledWith(
      'Invalid question returned by database:',
      expect.objectContaining({ type: 'future_type' })
    );
    errorSpy.mockRestore();
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

    expect(result).toEqual({
      success: true,
      data: [
        {
          id: 42,
          content: 'Question',
          type: 'multiple_choice',
          point_value: 2,
          category: 'Allgemein',
          solutionOptions: [],
          geocaching: null,
        },
      ],
    });
    expect(questionIdsQuery.select).toHaveBeenCalledWith('id');
    expect(questionIdsQuery.ilike).toHaveBeenCalledWith('content', '%Campus%');
    expect(questionsQuery.select).toHaveBeenCalledWith(QUESTION_SELECT);
    expect(answersQuery.select).toHaveBeenCalledWith('question_id');
    expect(answersQuery.ilike).toHaveBeenCalledWith('text', '%Campus%');
    expect(questionsQuery.in).toHaveBeenCalledWith('id', [7, 42]);
  });

  it('maps every valid database question type', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const validTypes = [
      'multiple_choice',
      'knowledge',
      'picture',
      'qr_code',
      'upload',
      'geocaching',
    ];
    const questionsQuery = makeQuery({
      data: validTypes.map((type, index) => ({
        id: index + 1,
        content: `Question ${index + 1}`,
        type,
        solutionOptions: [],
        geocaching: null,
      })),
      error: null,
    });
    const from = vi.fn((table: string) => {
      if (table === 'questions') return questionsQuery;
      throw new Error(`Unexpected table: ${table}`);
    });
    mockCreateClient.mockResolvedValue({ from });

    const { getQuestions } = await import('./question');
    const result = await getQuestions({});

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error('Expected question loading to succeed');
    }
    expect(result.data?.map((question) => question.type)).toEqual(validTypes);
  });

  it('skips an invalid catalog row and keeps valid questions', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const invalidRow = {
      id: 1,
      content: 'Unknown question',
      type: 'future_type',
      solutionOptions: [],
      geocaching: null,
    };
    const questionsQuery = makeQuery({
      data: [
        {
          id: 2,
          content: 'Valid question',
          type: 'knowledge',
          solutionOptions: [],
          geocaching: null,
        },
        invalidRow,
      ],
      error: null,
    });
    const from = vi.fn((table: string) => {
      if (table === 'questions') return questionsQuery;
      throw new Error(`Unexpected table: ${table}`);
    });
    mockCreateClient.mockResolvedValue({ from });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { getQuestions } = await import('./question');
    const result = await getQuestions({});

    expect(result).toEqual({
      success: true,
      data: [
        {
          id: 2,
          content: 'Valid question',
          type: 'knowledge',
          solutionOptions: [],
          geocaching: null,
        },
      ],
    });
    expect(errorSpy).toHaveBeenCalledWith(
      'Invalid question returned by database:',
      invalidRow
    );
    errorSpy.mockRestore();
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
