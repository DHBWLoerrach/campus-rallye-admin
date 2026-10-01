import { getQrCodeValue } from './qr-code-value';

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

export function isQrPrintQuestion(question: AssignedQuestion | null): boolean {
  if (question?.type === 'qr_code') return true;
  return (
    question?.type === 'geocaching' &&
    unwrap(question.geocaching_questions)?.input_type === 'qr'
  );
}

export interface QrPrintQuestion {
  id: number;
  content: string;
  value: string;
}

interface PrintableQuestion extends AssignedQuestion {
  id: number;
  content: string;
  solution_options: { text: string | null }[] | null;
}

export interface QrPrintRow {
  questions: PrintableQuestion | PrintableQuestion[] | null;
}

export function getQrPrintQuestions(rows: QrPrintRow[]): QrPrintQuestion[] {
  return rows
    .flatMap((row) => {
      const question = unwrap(row.questions);
      if (!question || !isQrPrintQuestion(question)) return [];
      return [
        {
          id: question.id,
          content: question.content,
          value: getQrCodeValue(question.solution_options),
        },
      ];
    })
    .sort(
      (a, b) =>
        a.content.localeCompare(b.content, 'de', { sensitivity: 'base' }) ||
        a.id - b.id
    );
}

export function countQrPrintQuestions(
  rows: AssignedQuestionRow[] | null | undefined
): number {
  return (rows ?? []).filter((row) => isQrPrintQuestion(unwrap(row.questions)))
    .length;
}
