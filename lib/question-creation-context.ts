export const QUESTION_RALLYE_ID_PARAM = 'rallyeId';

export type QuestionCreationContext =
  | { kind: 'none' }
  | { kind: 'invalid' }
  | { kind: 'rallye'; rallyeId: number };

export const parseQuestionCreationContext = (
  rallyeIdParam: string | null
): QuestionCreationContext => {
  if (rallyeIdParam === null || rallyeIdParam === '') {
    return { kind: 'none' };
  }
  if (!/^\d+$/.test(rallyeIdParam)) {
    return { kind: 'invalid' };
  }

  const rallyeId = Number(rallyeIdParam);
  if (!Number.isSafeInteger(rallyeId) || rallyeId <= 0) {
    return { kind: 'invalid' };
  }

  return { kind: 'rallye', rallyeId };
};

export const buildRallyeQuestionCreationHref = (rallyeId: number): string =>
  `/questions/new?${QUESTION_RALLYE_ID_PARAM}=${rallyeId}`;
