import { describe, expect, it } from 'vitest';
import { questionUpdateSchema } from './validation';

describe('questionUpdateSchema', () => {
  it('accepts nullable optional fields', () => {
    const result = questionUpdateSchema.safeParse({
      content: 'Frage',
      type: 'knowledge',
      points: 1,
      hint: null,
      category: null,
      bucket_path: null,
      answers: [{ id: 1, correct: true, text: 'Antwort' }],
      rallyeIds: [],
    });

    expect(result.success).toBe(true);
  });
});
