import { describe, expect, it } from 'vitest';
import type { Question } from '@/helpers/questions';
import { matchesQuestionFilters } from './question-filters';

const question: Question = {
  id: 1,
  content: 'Wo befindet sich die Mensa?',
  type: 'knowledge',
  category: 'Campus',
  solutionOptions: [{ id: 1, correct: true, text: 'Gebäude A' }],
};

describe('matchesQuestionFilters', () => {
  it.each(['Mensa', 'gebäude'])(
    'matches search text in content or answers',
    (search) => {
      expect(matchesQuestionFilters(question, { search })).toBe(true);
    }
  );

  it('combines the shared search with selected filters', () => {
    expect(
      matchesQuestionFilters(question, {
        search: 'Mensa',
        type: 'multiple_choice',
      })
    ).toBe(false);
  });
});
