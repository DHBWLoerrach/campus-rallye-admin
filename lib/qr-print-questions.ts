// Questions whose QR codes must be printed and placed on campus before a rallye
// starts: QR-code questions, and geocaching questions answered by scanning a QR
// code. Rows come from a rallye_questions select that embeds the question type
// and, for geocaching, its input type; embeds may arrive as an object or a
// single-element array depending on the relationship, so both are unwrapped.
interface GeocachingDetail {
  input_type: string | null;
}

interface AssignedQuestion {
  type: string | null;
  geocaching_questions: GeocachingDetail | GeocachingDetail[] | null;
}

export interface AssignedQuestionRow {
  questions: AssignedQuestion | AssignedQuestion[] | null;
}

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function countQrPrintQuestions(
  rows: AssignedQuestionRow[] | null | undefined
): number {
  return (rows ?? []).filter((row) => {
    const question = unwrap(row.questions);
    if (!question) return false;
    if (question.type === 'qr_code') return true;
    if (question.type === 'geocaching') {
      return unwrap(question.geocaching_questions)?.input_type === 'qr';
    }
    return false;
  }).length;
}
