import type { Question } from '@/helpers/questions';

export interface QuestionContentFilters {
  search?: string;
  type?: string;
  category?: string;
}

export interface QuestionCatalogFilters extends QuestionContentFilters {
  rallyeId?: string;
}

export const matchesQuestionFilters = (
  question: Question,
  filters: QuestionContentFilters
): boolean => {
  const searchTerm = filters.search?.trim().toLocaleLowerCase('de');
  if (searchTerm) {
    const contentMatches = question.content
      ?.toLocaleLowerCase('de')
      .includes(searchTerm);
    const answerMatches = (question.solutionOptions ?? []).some((answer) =>
      answer.text?.toLocaleLowerCase('de').includes(searchTerm)
    );
    if (!contentMatches && !answerMatches) {
      return false;
    }
  }

  if (
    filters.type &&
    filters.type !== 'all' &&
    question.type !== filters.type
  ) {
    return false;
  }
  if (
    filters.category &&
    filters.category !== 'all' &&
    question.category !== filters.category
  ) {
    return false;
  }
  return true;
};
