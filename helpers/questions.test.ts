import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  questionTypes,
  type QuestionTypeDefinition,
  type QuestionTypeId,
} from './questionTypes';
import {
  copyQuestionForCreation,
  type CopiedQuestionFormData,
  type GeocachingConfig,
  type Question,
  type QuestionFormData,
} from './questions';

describe('copyQuestionForCreation', () => {
  it('copies editable content without ids, assignments or image references', () => {
    const copy = copyQuestionForCreation({
      id: 12,
      content: 'Welches Gebäude ist zu sehen?',
      type: 'picture',
      point_value: 4,
      hint: 'Am Haupteingang',
      category: 'Campus',
      bucket_path: 'questions/building.png',
      solutionOptions: [
        {
          id: 7,
          question_id: 12,
          correct: true,
          text: 'Gebäude A',
        },
      ],
    });

    expect(copy).toEqual({
      content: 'Welches Gebäude ist zu sehen?',
      type: 'picture',
      point_value: 4,
      hint: 'Am Haupteingang',
      category: 'Campus',
      solutionOptions: [{ correct: true, text: 'Gebäude A' }],
    });
    expect(copy).not.toHaveProperty('id');
    expect(copy).not.toHaveProperty('rallyeIds');
    expect(copy).not.toHaveProperty('bucket_path');
  });

  it('copies an independent complete geocaching configuration', () => {
    const question: Question = {
      id: 21,
      content: 'Finde den Zielort',
      type: 'geocaching',
      point_value: 5,
      geocaching: {
        target_latitude: 47.615123,
        target_longitude: 7.664321,
        proximity_radius: 15,
        input_type: 'qr',
      },
      solutionOptions: [
        {
          id: 8,
          question_id: 21,
          correct: true,
          text: 'CACHE-21',
        },
      ],
    };

    const copy = copyQuestionForCreation(question);

    expect(copy).toEqual({
      content: 'Finde den Zielort',
      type: 'geocaching',
      point_value: 5,
      hint: undefined,
      category: undefined,
      geocaching: {
        target_latitude: 47.615123,
        target_longitude: 7.664321,
        proximity_radius: 15,
        input_type: 'qr',
      },
      solutionOptions: [{ correct: true, text: 'CACHE-21' }],
    });
    expect(copy.geocaching).not.toBe(question.geocaching);
    expect(copy).not.toHaveProperty('id');
    expect(copy).not.toHaveProperty('rallyeIds');
  });

  it('keeps persisted, draft and copied question types distinct', () => {
    const draft: QuestionFormData = {
      content: '',
      type: '',
      geocaching: { input_type: 'text' },
    };
    const copied: CopiedQuestionFormData = copyQuestionForCreation({
      id: 22,
      content: 'Ziel',
      type: 'geocaching',
      geocaching: {
        target_latitude: 47.61,
        target_longitude: 7.66,
        proximity_radius: 10,
        input_type: 'text',
      },
    });
    const initialData: Partial<Question> = copied;

    expect(draft.geocaching).toEqual({ input_type: 'text' });
    expect(initialData.type).toBe('geocaching');
    expectTypeOf<Question['type']>().toEqualTypeOf<QuestionTypeId>();
    expectTypeOf<QuestionFormData['type']>().toEqualTypeOf<
      QuestionTypeId | ''
    >();
    expectTypeOf<
      NonNullable<Question['geocaching']>
    >().toEqualTypeOf<GeocachingConfig>();
    expectTypeOf(copied).toEqualTypeOf<CopiedQuestionFormData>();
  });

  it('keeps the five editor definitions compatible with every question type', () => {
    expect(questionTypes).toHaveLength(5);
    expect(questionTypes.some((type) => type.id === 'geocaching')).toBe(false);
    expectTypeOf(questionTypes).toMatchTypeOf<
      readonly QuestionTypeDefinition[]
    >();
  });
});
