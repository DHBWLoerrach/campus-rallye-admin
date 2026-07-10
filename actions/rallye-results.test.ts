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

  it('fails when the rallye is not in results or ended', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const rallyeQuery = {
      select: vi.fn(() => rallyeQuery),
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1, status: 'running' },
          error: null,
        }),
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

  it('gives equal-point teams a shared rank and orders them by name, not speed', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const rallyeQuery = {
      select: vi.fn(() => rallyeQuery),
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1, status: 'results' },
          error: null,
        }),
      })),
    };

    // Team Beta finished faster, but speed must not affect placement.
    const teamRows = [
      {
        id: 10,
        name: 'Team Alpha',
        created_at: '2024-01-01T00:00:00.000Z',
        play_time: '2024-01-01T00:20:00.000Z',
      },
      {
        id: 11,
        name: 'Team Beta',
        created_at: '2024-01-01T00:00:00.000Z',
        play_time: '2024-01-01T00:15:00.000Z',
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
        if (table === 'rallyes') return rallyeQuery;
        if (table === 'teams') return teamQuery;
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
    // Equal points -> same rank; neutral alphabetical order for display.
    expect(result.data?.[0].teamName).toBe('Team Alpha');
    expect(result.data?.[0].rank).toBe(1);
    expect(result.data?.[1].teamName).toBe('Team Beta');
    expect(result.data?.[1].rank).toBe(1);
    expect(result.data?.[0].photoUrl).toBe('https://example.com/newer.png');
    expect(result.data?.[1].photoUrl).toBe('https://example.com/team-b.png');
    expect(storageFrom).toHaveBeenCalledWith('upload-photos');
    expect(createSignedUrl).toHaveBeenCalledWith('newer.png', 3600);
  });

  it('orders by points desc and skips ranks after a tie', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const rallyeQuery = {
      select: vi.fn(() => rallyeQuery),
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { id: 1, status: 'ended' },
          error: null,
        }),
      })),
    };

    const teamRows = [
      {
        id: 20,
        name: 'Team Beta',
        created_at: '2024-01-01T00:00:00.000Z',
        play_time: '2024-01-01T00:10:00.000Z',
      },
      {
        id: 21,
        name: 'Team Alpha',
        created_at: '2024-01-01T00:00:00.000Z',
        play_time: '2024-01-01T00:30:00.000Z',
      },
      {
        id: 22,
        name: 'Team Gamma',
        created_at: '2024-01-01T00:00:00.000Z',
        play_time: '2024-01-01T00:05:00.000Z',
      },
    ];

    const teamQuery = {
      select: vi.fn(() => teamQuery),
      eq: vi.fn(() => Promise.resolve({ data: teamRows, error: null })),
    };

    // Alpha and Beta tie on 8 points; Gamma trails with 3.
    const teamQuestionRows = [
      { team_id: 20, points: 8 },
      { team_id: 21, points: 8 },
      { team_id: 22, points: 3 },
    ];

    const teamQuestionQuery = {
      select: vi.fn(() => teamQuestionQuery),
      in: vi.fn(() => Promise.resolve({ data: teamQuestionRows, error: null })),
    };

    const uploadQuery = {
      select: vi.fn(() => uploadQuery),
      in: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    };

    const storageFrom = vi.fn(() => ({ createSignedUrl: vi.fn() }));

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
        if (table === 'rallyes') return rallyeQuery;
        if (table === 'teams') return teamQuery;
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
    // Tie for first (alphabetical display order), then a gap to rank 3.
    expect(result.data?.map((row) => [row.teamName, row.rank])).toEqual([
      ['Team Alpha', 1],
      ['Team Beta', 1],
      ['Team Gamma', 3],
    ]);
  });

  it('returns 0 for rallye with no teams', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const rallyeQuery = {
      select: vi.fn(() => rallyeQuery),
      eq: vi.fn(() => ({
        maybeSingle: vi
          .fn()
          .mockResolvedValue({ data: { id: 1, status: 'ended' }, error: null }),
      })),
    };

    const teamQuery = {
      select: vi.fn(() => teamQuery),
      eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
    };

    mockCreateClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'rallyes') return rallyeQuery;
        if (table === 'teams') return teamQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const { getRallyeResults } = await import('./rallye-results');
    const result = await getRallyeResults(1);

    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Expected success');
    expect(result.data).toEqual([]);
  });
});

describe('getRallyeMaxPoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns sum of all question points for a rallye', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const joinQuery = {
      select: vi.fn(() => joinQuery),
      eq: vi.fn(() => ({
        then: vi.fn((cb) =>
          cb({
            data: [{ question_id: 1 }, { question_id: 2 }, { question_id: 3 }],
            error: null,
          })
        ),
      })),
    };

    const questionQuery = {
      select: vi.fn(() => questionQuery),
      in: vi.fn(() =>
        Promise.resolve({
          data: [{ points: 5 }, { points: 3 }, { points: 2 }],
          error: null,
        })
      ),
    };

    mockCreateClient.mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === 'rallye_questions') return joinQuery;
        if (table === 'questions') return questionQuery;
        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const { getRallyeMaxPoints } = await import('./rallye-results');
    const result = await getRallyeMaxPoints(1);

    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Expected success');
    expect(result.data).toBe(10);
  });

  it('returns 0 for rallye with no questions', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const joinQuery = {
      select: vi.fn(() => joinQuery),
      eq: vi.fn(() => ({
        then: vi.fn((cb) =>
          cb({
            data: [],
            error: null,
          })
        ),
      })),
    };

    mockCreateClient.mockResolvedValue({
      from: vi.fn(() => joinQuery),
    });

    const { getRallyeMaxPoints } = await import('./rallye-results');
    const result = await getRallyeMaxPoints(1);

    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Expected success');
    expect(result.data).toBe(0);
  });

  it('rejects invalid rallye ids without touching Supabase', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const { getRallyeMaxPoints } = await import('./rallye-results');
    const result = await getRallyeMaxPoints(0);

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected validation to fail');
    expect(result.error).toBe('Ungültige Rallye-ID');
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});
