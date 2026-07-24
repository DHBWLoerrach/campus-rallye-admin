import { describe, expect, it } from 'vitest';
import {
  countQrPrintQuestions,
  type AssignedQuestionRow,
} from './qr-print-questions';

const row = (type: string, inputType?: string): AssignedQuestionRow => ({
  questions: {
    type,
    geocaching_questions:
      inputType === undefined ? null : { input_type: inputType },
  },
});

describe('countQrPrintQuestions', () => {
  it('counts qr-code and geocaching-with-qr questions', () => {
    const rows: AssignedQuestionRow[] = [
      row('qr_code'),
      row('geocaching', 'qr'),
      row('geocaching', 'text'),
      row('knowledge'),
      row('upload'),
    ];
    expect(countQrPrintQuestions(rows)).toBe(2);
  });

  it('unwraps single-element array embeds', () => {
    const rows: AssignedQuestionRow[] = [
      {
        questions: [
          { type: 'geocaching', geocaching_questions: [{ input_type: 'qr' }] },
        ],
      },
    ];
    expect(countQrPrintQuestions(rows)).toBe(1);
  });

  it('returns zero for empty or missing input', () => {
    expect(countQrPrintQuestions([])).toBe(0);
    expect(countQrPrintQuestions(null)).toBe(0);
    expect(countQrPrintQuestions(undefined)).toBe(0);
  });
});
