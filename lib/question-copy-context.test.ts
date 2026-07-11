import { describe, expect, it } from 'vitest';
import {
  buildQuestionCopyHref,
  parseQuestionCopyContext,
} from './question-copy-context';

describe('question copy context', () => {
  it('parses one positive safe integer id', () => {
    expect(parseQuestionCopyContext('12')).toEqual({
      kind: 'copy',
      questionId: 12,
    });
  });

  it.each([[''], [['12']], ['0'], ['-1'], ['1.5'], ['999999999999999999999']])(
    'rejects invalid copy source %j',
    (value) => {
      expect(parseQuestionCopyContext(value)).toEqual({ kind: 'invalid' });
    }
  );

  it('distinguishes a missing copy parameter from an invalid one', () => {
    expect(parseQuestionCopyContext(undefined)).toEqual({ kind: 'none' });
  });

  it('builds the catalog copy link from the shared parameter contract', () => {
    expect(buildQuestionCopyHref(12)).toBe('/questions/new?copyFrom=12');
  });
});
