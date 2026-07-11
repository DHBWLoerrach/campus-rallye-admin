import { describe, expect, it } from 'vitest';
import { questionCreateSchema, questionUpdateSchema } from './validation';

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
