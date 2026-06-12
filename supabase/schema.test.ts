import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Supabase schema files', () => {
  it('do not leave trailing commas at the end of CREATE TABLE column lists', () => {
    const schema = readFileSync(join(process.cwd(), 'supabase/schema_v4.sql'), {
      encoding: 'utf8',
    });
    const createTableBlocks = schema.matchAll(
      /CREATE TABLE IF NOT EXISTS "public"\."([^"]+)" \(([\s\S]*?)\n\);/g
    );

    const tablesWithTrailingComma = Array.from(createTableBlocks)
      .filter((match) => match[2].trimEnd().endsWith(','))
      .map((match) => match[1]);

    expect(tablesWithTrailingComma).toEqual([]);
  });
});
