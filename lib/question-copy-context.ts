import { parsePositiveSafeInteger } from '@/lib/positive-safe-integer';

export const QUESTION_COPY_FROM_PARAM = 'copyFrom';

export type QuestionCopyContext =
  | { kind: 'none' }
  | { kind: 'invalid' }
  | { kind: 'copy'; questionId: number };

export const parseQuestionCopyContext = (
  copyFromParam: string | string[] | undefined
): QuestionCopyContext => {
  if (copyFromParam === undefined) {
    return { kind: 'none' };
  }
  if (typeof copyFromParam !== 'string') {
    return { kind: 'invalid' };
  }

  const questionId = parsePositiveSafeInteger(copyFromParam);
  return questionId === undefined
    ? { kind: 'invalid' }
    : { kind: 'copy', questionId };
};

export const buildQuestionCopyHref = (questionId: number): string =>
  `/questions/new?${QUESTION_COPY_FROM_PARAM}=${questionId}`;
