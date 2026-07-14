import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  formatZodError,
  questionCreateSchema,
  questionUpdateSchema,
} from './validation';

describe('questionUpdateSchema', () => {
  it('accepts nullable optional fields', () => {
    const result = questionUpdateSchema.safeParse({
      content: 'Frage',
      type: 'knowledge',
      point_value: 1,
      hint: null,
      category: null,
      bucket_path: null,
      solutionOptions: [{ id: 1, correct: true, text: 'Antwort' }],
      rallyeIds: [],
    });

    expect(result.success).toBe(true);
  });
});

describe('question point value validation', () => {
  it.each([2.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects a non-safe integer point value: %s',
    (point_value) => {
      const result = questionCreateSchema.safeParse({
        content: 'Wo ist die Mensa?',
        type: 'knowledge',
        point_value,
        solutionOptions: [{ correct: true, text: 'Gebäude A' }],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(formatZodError(result.error).point_value).toBe(
          'Punktwert muss eine ganze Zahl sein'
        );
      }
    }
  );
});

describe('picture question validation', () => {
  const pictureQuestion = {
    content: 'Welches Gebäude ist zu sehen?',
    type: 'picture',
    solutionOptions: [{ correct: true, text: 'Gebäude A' }],
  };

  it('requires an uploaded image when creating a picture question', () => {
    const result = questionCreateSchema.safeParse(pictureQuestion);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.bucket_path).toContain(
        'Bitte ein Bild hochladen'
      );
    }
  });

  it('accepts a picture question with an uploaded image', () => {
    expect(
      questionCreateSchema.safeParse({
        ...pictureQuestion,
        bucket_path: 'questions/building.png',
      }).success
    ).toBe(true);
  });
});

describe('geocaching question validation', () => {
  const geocachingQuestion = {
    content: 'Finde den Haupteingang',
    type: 'geocaching',
    point_value: 3,
    geocaching: {
      target_latitude: 47.615123,
      target_longitude: 7.664321,
      proximity_radius: 10,
      input_type: 'text',
    },
    solutionOptions: [{ correct: true, text: 'Haupteingang' }],
  };

  const expectIssueAt = (input: unknown, path: string) => {
    const result = questionCreateSchema.safeParse(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(formatZodError(result.error)).toHaveProperty(path);
    }
  };

  it('accepts valid text and QR input questions', () => {
    expect(questionCreateSchema.safeParse(geocachingQuestion).success).toBe(
      true
    );
    expect(
      questionCreateSchema.safeParse({
        ...geocachingQuestion,
        geocaching: {
          ...geocachingQuestion.geocaching,
          input_type: 'qr',
        },
      }).success
    ).toBe(true);
  });

  it('applies radius and input type defaults', () => {
    const result = questionCreateSchema.safeParse({
      ...geocachingQuestion,
      geocaching: {
        target_latitude: 47.615123,
        target_longitude: 7.664321,
      },
    });

    expect(result.success).toBe(true);
    if (result.success && result.data.type === 'geocaching') {
      expect(result.data.geocaching).toEqual({
        target_latitude: 47.615123,
        target_longitude: 7.664321,
        proximity_radius: 10,
        input_type: 'text',
      });
    }
  });

  it('rejects missing geocaching configuration', () => {
    expectIssueAt(
      {
        content: geocachingQuestion.content,
        type: geocachingQuestion.type,
        point_value: geocachingQuestion.point_value,
        solutionOptions: geocachingQuestion.solutionOptions,
      },
      'geocaching'
    );
  });

  it.each([-90.000001, 90.000001])(
    'rejects latitude outside its range: %s',
    (target_latitude) => {
      expectIssueAt(
        {
          ...geocachingQuestion,
          geocaching: {
            ...geocachingQuestion.geocaching,
            target_latitude,
          },
        },
        'geocaching.target_latitude'
      );
    }
  );

  it.each([-180.000001, 180.000001])(
    'rejects longitude outside its range: %s',
    (target_longitude) => {
      expectIssueAt(
        {
          ...geocachingQuestion,
          geocaching: {
            ...geocachingQuestion.geocaching,
            target_longitude,
          },
        },
        'geocaching.target_longitude'
      );
    }
  );

  it.each([0, -1, 1.5, Number.POSITIVE_INFINITY, Number.NaN])(
    'rejects an invalid radius: %s',
    (proximity_radius) => {
      expectIssueAt(
        {
          ...geocachingQuestion,
          geocaching: {
            ...geocachingQuestion.geocaching,
            proximity_radius,
          },
        },
        'geocaching.proximity_radius'
      );
    }
  );

  it('rejects an unknown input type', () => {
    expectIssueAt(
      {
        ...geocachingQuestion,
        geocaching: {
          ...geocachingQuestion.geocaching,
          input_type: 'barcode',
        },
      },
      'geocaching.input_type'
    );
  });

  it.each([
    { case: 'zero', solutionOptions: [] },
    {
      case: 'multiple',
      solutionOptions: [
        { correct: true, text: 'Erste Lösung' },
        { correct: false, text: 'Zweite Lösung' },
      ],
    },
  ])('rejects $case non-empty solutions', ({ solutionOptions }) => {
    expectIssueAt(
      { ...geocachingQuestion, solutionOptions },
      'solutionOptions'
    );
  });

  it('rejects a sole solution that is not marked correct', () => {
    expectIssueAt(
      {
        ...geocachingQuestion,
        solutionOptions: [{ correct: false, text: 'Haupteingang' }],
      },
      'solutionOptions'
    );
  });

  it('rejects stale geocaching configuration on another question type', () => {
    expectIssueAt(
      {
        ...geocachingQuestion,
        type: 'knowledge',
      },
      'geocaching'
    );
  });

  it('exposes complete coordinates after successful type narrowing', () => {
    const result = questionCreateSchema.safeParse(geocachingQuestion);

    expect(result.success).toBe(true);
    if (!result.success || result.data.type !== 'geocaching') {
      throw new Error('Expected a valid geocaching question');
    }

    expectTypeOf(
      result.data.geocaching.target_latitude
    ).toEqualTypeOf<number>();
    expectTypeOf(
      result.data.geocaching.target_longitude
    ).toEqualTypeOf<number>();
    expectTypeOf(
      result.data.geocaching.proximity_radius
    ).toEqualTypeOf<number>();
  });
});
