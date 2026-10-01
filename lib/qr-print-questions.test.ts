import { describe, expect, it } from 'vitest';
import {
  countQrPrintQuestions,
  getQrPrintQuestions,
  type QrPrintRow,
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

const printableRow = (
  id: number,
  type: string,
  inputType?: string
): QrPrintRow => ({
  questions: {
    type,
    geocaching_questions: inputType ? { input_type: inputType } : null,
    id,
    content: `Frage ${id}`,
    solution_options: [{ text: `  Lösung ${id}  ` }],
  },
});

describe('getQrPrintQuestions', () => {
  it('selects QR-based questions and trims their first solution', () => {
    expect(
      getQrPrintQuestions([
        printableRow(2, 'geocaching', 'qr'),
        printableRow(1, 'qr_code'),
        printableRow(3, 'geocaching', 'text'),
        printableRow(4, 'knowledge'),
        { questions: null },
      ])
    ).toEqual([
      { id: 1, content: 'Frage 1', value: 'Lösung 1' },
      { id: 2, content: 'Frage 2', value: 'Lösung 2' },
    ]);
  });

  it('unwraps array relationships and retains missing answers for visible errors', () => {
    expect(
      getQrPrintQuestions([
        {
          questions: [
            {
              id: 1,
              content: 'Ohne Lösung',
              type: 'qr_code',
              geocaching_questions: null,
              solution_options: [],
            },
          ],
        },
      ])
    ).toEqual([{ id: 1, content: 'Ohne Lösung', value: '' }]);
  });

  it('retains missing or empty first solutions for visible errors', () => {
    for (const options of [
      null,
      [{ text: ' ' }],
      [{ text: null }],
      [{ text: ' ' }, { text: 'B' }],
    ]) {
      expect(
        getQrPrintQuestions([
          {
            questions: {
              id: 1,
              content: 'Frage',
              type: 'qr_code',
              geocaching_questions: null,
              solution_options: options,
            },
          },
        ])[0].value
      ).toBe('');
    }
  });
});
