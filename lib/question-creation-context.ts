import { parsePositiveSafeInteger } from '@/lib/positive-safe-integer';

export const QUESTION_RALLYE_ID_PARAM = 'rallyeId';
export const QUESTION_RETURN_TO_PARAM = 'returnTo';

export type QuestionCreationContext =
  { kind: 'none' } | { kind: 'invalid' } | { kind: 'rallye'; rallyeId: number };

export const parseQuestionCreationContext = (
  rallyeIdParam: string | null
): QuestionCreationContext => {
  if (rallyeIdParam === null || rallyeIdParam === '') {
    return { kind: 'none' };
  }
  const rallyeId = parsePositiveSafeInteger(rallyeIdParam);
  if (rallyeId === undefined) {
    return { kind: 'invalid' };
  }

  return { kind: 'rallye', rallyeId };
};

export const isRallyeQuestionContext = (
  isNew: boolean,
  creationContext: QuestionCreationContext,
  returnTo: string
): boolean =>
  (isNew && creationContext.kind === 'rallye') ||
  returnTo.startsWith('/rallyes/');

export const buildRallyeQuestionCreationHref = (rallyeId: number): string =>
  `/questions/new?${QUESTION_RALLYE_ID_PARAM}=${rallyeId}`;
