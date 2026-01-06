import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRequireProfile, mockCreateClient } = vi.hoisted(() => ({
  mockRequireProfile: vi.fn(),
  mockCreateClient: vi.fn(),
}));

vi.mock('@/lib/require-profile', () => ({
  requireProfile: mockRequireProfile,
}));

vi.mock('@/lib/supabase', () => ({
  default: mockCreateClient,
}));

describe('getRallyeResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('rejects invalid rallye ids without touching Supabase', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const { getRallyeResults } = await import('./rallye-results');
    const result = await getRallyeResults(0);

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected validation to fail');
    }
    expect(result.error).toBe('Ungültige Rallye-ID');
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('fails when the rallye is not ended', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const rallyeQuery = {
      select: vi.fn(() => rallyeQuery),
      eq: vi.fn(() => ({
        maybeSingle: vi
          .fn()
          .mockResolvedValue({ data: { id: 1, status: 'running' }, error: null }),
      })),
    };

    mockCreateClient.mockResolvedValue({
      from: vi.fn(() => rallyeQuery),
    });

    const { getRallyeResults } = await import('./rallye-results');
    const result = await getRallyeResults(1);

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected status check to fail');
    }
    expect(result.error).toBe('Rallye ist nicht beendet');
  });

  it('orders by points desc then duration asc and assigns ranks', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const rallyeQuery = {
      select: vi.fn(() => rallyeQuery),
      eq: vi.fn(() => ({
        maybeSingle: vi
          .fn()
          .mockResolvedValue({ data: { id: 1, status: 'ended' }, error: null }),
      })),
    };

    const teamRows = [
      {
        id: 10,
        name: 'Team Alpha',
        created_at: '2024-01-01T00:00:00.000Z',
        time_played: '2024-01-01T00:20:00.000Z',
      },
      {
        id: 11,
        name: 'Team Beta',
        created_at: '2024-01-01T00:00:00.000Z',
        time_played: '2024-01-01T00:15:00.000Z',
      },
    ];

    const teamQuery = {
      select: vi.fn(() => teamQuery),
      eq: vi.fn(() => Promise.resolve({ data: teamRows, error: null })),
    };

    const teamQuestionRows = [
      { team_id: 10, points: 5 },
      { team_id: 11, points: 5 },
    ];

    const teamQuestionQuery = {
      select: vi.fn(() => teamQuestionQuery),
      in: vi.fn(() => Promise.resolve({ data: teamQuestionRows, error: null })),
    };

    const uploadRows = [
      {
        team_id: 10,
        team_answer: 'older.png',
        created_at: '2024-01-01T00:10:00.000Z',
      },
      {
        team_id: 10,
        team_answer: 'newer.png',
        created_at: '2024-01-01T00:12:00.000Z',
      },
      {
        team_id: 11,
        team_answer: 'team-b.png',
        created_at: '2024-01-01T00:05:00.000Z',
      },
    ];

    const uploadQuery = {
      select: vi.fn(() => uploadQuery),
      in: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: uploadRows, error: null })),
      })),
    };

    const createSignedUrl = vi.fn((path: string) =>
      Promise.resolve({
        data: { signedUrl: `https://example.com/${path}` },
        error: null,
      })
    );
    const storageFrom = vi.fn(() => ({ createSignedUrl }));

    const teamQuestionsRouter = {
      select: vi.fn((fields: string) => {
        if (fields.includes('team_answer')) {
          return uploadQuery;
        }
        return teamQuestionQuery;
      }),
    };

    mockCreateClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'rallye') return rallyeQuery;
        if (table === 'rallye_team') return teamQuery;
        if (table === 'team_questions') return teamQuestionsRouter;
        throw new Error(`Unexpected table ${table}`);
      }),
      storage: { from: storageFrom },
    });

    const { getRallyeResults } = await import('./rallye-results');
    const result = await getRallyeResults(1);

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error('Expected success');
    }
    expect(result.data?.[0].teamName).toBe('Team Beta');
    expect(result.data?.[0].rank).toBe(1);
    expect(result.data?.[1].teamName).toBe('Team Alpha');
    expect(result.data?.[1].rank).toBe(2);
    expect(result.data?.[0].photoUrl).toBe('https://example.com/team-b.png');
    expect(result.data?.[1].photoUrl).toBe('https://example.com/newer.png');
    expect(storageFrom).toHaveBeenCalledWith('upload_photo_answers');
    expect(createSignedUrl).toHaveBeenCalledWith('newer.png', 3600);
  });
});
