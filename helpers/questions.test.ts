import { describe, expect, it } from 'vitest';
import { copyQuestionForCreation } from './questions';

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
});
