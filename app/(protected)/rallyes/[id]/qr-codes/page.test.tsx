import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RallyeQrPrintPage from './page';

const { requireProfile, createClient, notFound, rallyeQuery, questionsQuery } =
  vi.hoisted(() => ({
    requireProfile: vi.fn(),
    createClient: vi.fn(),
    notFound: vi.fn(() => {
      throw new Error('not-found');
    }),
    rallyeQuery: { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() },
    questionsQuery: { select: vi.fn(), order: vi.fn(), eq: vi.fn() },
  }));
vi.mock('@/lib/require-profile', () => ({ requireProfile }));
vi.mock('@/lib/supabase', () => ({ default: createClient }));
vi.mock('next/navigation', () => ({ notFound }));

beforeEach(() => {
  vi.resetAllMocks();
  requireProfile.mockResolvedValue({ user_id: 'organizer' });
  rallyeQuery.select.mockReturnValue(rallyeQuery);
  rallyeQuery.eq.mockReturnValue(rallyeQuery);
  rallyeQuery.maybeSingle.mockResolvedValue({
    data: { id: 5, name: 'Meine Rallye' },
    error: null,
  });
  questionsQuery.select.mockReturnValue(questionsQuery);
  questionsQuery.order.mockReturnValue(questionsQuery);
  questionsQuery.eq.mockResolvedValue({
    data: [
      {
        questions: {
          id: 42,
          content: 'Mensa',
          type: 'qr_code',
          solution_options: [{ text: 'station-42' }],
          geocaching_questions: null,
        },
      },
    ],
    error: null,
  });
  createClient.mockResolvedValue({
    from: (table: string) =>
      table === 'rallyes' ? rallyeQuery : questionsQuery,
  });
  notFound.mockImplementation(() => {
    throw new Error('not-found');
  });
});

describe('RallyeQrPrintPage', () => {
  it('loads only the requested rallye assignments and displays their QR codes', async () => {
    render(await RallyeQrPrintPage({ params: Promise.resolve({ id: '5' }) }));
    expect(rallyeQuery.eq).toHaveBeenCalledWith('id', 5);
    expect(questionsQuery.eq).toHaveBeenCalledWith('rallye_id', 5);
    expect(
      screen.getByRole('heading', { name: 'QR-Codes drucken: Meine Rallye' })
    ).toBeInTheDocument();
    expect(screen.getByTitle('QR-Code für Frage 42')).toBeInTheDocument();
  });

  it('does not access data for an unapproved profile', async () => {
    requireProfile.mockRejectedValue(new Error('Zugriff verweigert'));
    await expect(
      RallyeQrPrintPage({ params: Promise.resolve({ id: '5' }) })
    ).rejects.toThrow('Zugriff verweigert');
    expect(createClient).not.toHaveBeenCalled();
  });

  it.each(['abc', '0', '9007199254740993'])(
    'rejects invalid rallye ID %s',
    async (id) => {
      await expect(
        RallyeQrPrintPage({ params: Promise.resolve({ id }) })
      ).rejects.toThrow('not-found');
      expect(createClient).not.toHaveBeenCalled();
    }
  );

  it('does not load assignments if the rallye is absent or inaccessible', async () => {
    rallyeQuery.maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(
      RallyeQrPrintPage({ params: Promise.resolve({ id: '5' }) })
    ).rejects.toThrow('not-found');
    expect(questionsQuery.select).not.toHaveBeenCalled();
  });

  it('reports query failures instead of showing an empty printable sheet', async () => {
    questionsQuery.eq.mockResolvedValue({
      data: null,
      error: { message: 'lookup failed' },
    });
    await expect(
      RallyeQrPrintPage({ params: Promise.resolve({ id: '5' }) })
    ).rejects.toThrow('QR-Code-Fragen konnten nicht geladen werden');
  });
});
