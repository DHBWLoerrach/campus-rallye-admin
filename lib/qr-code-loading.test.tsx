import { render, screen } from '@testing-library/react';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { getQuestionById, getQuestions } from '@/actions/question';
import RallyeQrPrintPage from '@/app/(protected)/rallyes/[id]/qr-codes/page';
import { getQrCodeValue } from './qr-code-value';

const { mockCreateClient } = vi.hoisted(() => ({ mockCreateClient: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ default: mockCreateClient }));
vi.mock('@/lib/require-profile', () => ({
  requireProfile: vi.fn().mockResolvedValue({ user_id: 'staff' }),
}));
vi.mock('@/actions/upload', () => ({ deleteImage: vi.fn() }));
vi.mock('@/actions/assign_questions_to_rallye', () => ({
  assignRallyesToQuestion: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not found');
  },
}));
vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <svg role="img" aria-label={`Kodierter Inhalt: ${value}`} />
  ),
}));

describe('QR codes from persisted questions', () => {
  it.each(['qr_code', 'geocaching'])(
    'selects the smallest solution ID in single, catalog and print queries for %s',
    async (type) => {
      const requests: URL[] = [];
      const solutions = [
        { id: 20, correct: true, text: ' Zweite Lösung ' },
        { id: 3, correct: true, text: ' Erste Lösung ' },
      ];
      const fetchResponse = vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        requests.push(url);
        let data: unknown;
        if (url.pathname.endsWith('/rallyes')) {
          data = { id: 5, name: 'Meine Rallye' };
        } else {
          const isPrint = url.pathname.endsWith('/rallye_questions');
          const orderKey = isPrint
            ? 'questions.solution_options.order'
            : 'solutionOptions.order';
          // Simulate PostgREST applying the requested embedded ordering to old data.
          const options =
            url.searchParams.get(orderKey) === 'id.asc'
              ? [...solutions].sort((a, b) => a.id - b.id)
              : solutions;
          const question = {
            id: 42,
            content: 'Station',
            type,
            ...(isPrint
              ? {
                  solution_options: options,
                  geocaching_questions: { input_type: 'qr' },
                }
              : {
                  solutionOptions: options,
                  geocaching:
                    type === 'geocaching'
                      ? {
                          target_latitude: 0,
                          target_longitude: 0,
                          proximity_radius: 20,
                          input_type: 'qr',
                        }
                      : null,
                }),
          };
          data = isPrint
            ? [{ questions: question }]
            : url.searchParams.has('id')
              ? question
              : [question];
        }
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      });
      mockCreateClient.mockResolvedValue(
        createSupabaseClient('https://qr-test.invalid', 'test-key', {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
            storageKey: `qr-test-${type}`,
          },
          global: { fetch: fetchResponse },
        })
      );

      const single = await getQuestionById(42);
      const catalog = await getQuestions({});
      if (!single.success || !single.data || !catalog.success || !catalog.data)
        throw new Error('Question loading failed');
      expect(getQrCodeValue(single.data.solutionOptions)).toBe('Erste Lösung');
      expect(getQrCodeValue(catalog.data[0].solutionOptions)).toBe(
        'Erste Lösung'
      );
      render(await RallyeQrPrintPage({ params: Promise.resolve({ id: '5' }) }));
      expect(
        screen.getByRole('img', { name: 'Kodierter Inhalt: Erste Lösung' })
      ).toBeInTheDocument();
      expect(
        requests.filter((url) => url.pathname.endsWith('/questions'))
      ).toHaveLength(2);
      expect(
        requests
          .find((url) => url.pathname.endsWith('/rallye_questions'))
          ?.searchParams.get('questions.solution_options.order')
      ).toBe('id.asc');
    }
  );
});
