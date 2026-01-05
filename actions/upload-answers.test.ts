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

describe('getRallyeUploadAnswers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns an error when the rallye does not exist', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const rallyeQuery = {
      select: vi.fn(() => rallyeQuery),
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    };

    mockCreateClient.mockResolvedValue({
      from: vi.fn(() => rallyeQuery),
    });

    const { getRallyeUploadAnswers } = await import('./upload-answers');
    const result = await getRallyeUploadAnswers(12);

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected validation to fail');
    }
    expect(result.error).toBe('Rallye nicht gefunden');
  });

  it('groups upload answers and lists teams without photos', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const rallyeQuery = {
      select: vi.fn(() => rallyeQuery),
      eq: vi.fn(() => ({
        maybeSingle: vi
          .fn()
          .mockResolvedValue({ data: { id: 12 }, error: null }),
      })),
    };

    const joinRows = [
      {
        question_id: 10,
        questions: { id: 10, content: 'Upload-Frage', type: 'upload' },
      },
    ];
    const joinQuery = {
      select: vi.fn(() => joinQuery),
      eq: vi.fn((field: string) => {
        if (field === 'questions.type') {
          return Promise.resolve({ data: joinRows, error: null });
        }
        return joinQuery;
      }),
    };

    const teamRows = [
      { id: 1, name: 'Team Alpha' },
      { id: 2, name: 'Team Beta' },
    ];
    const teamQuery = {
      select: vi.fn(() => teamQuery),
      eq: vi.fn(() => Promise.resolve({ data: teamRows, error: null })),
    };

    const teamQuestionRows = [
      {
        id: 5,
        team_id: 1,
        question_id: 10,
        team_answer: 'photo.png',
      },
      {
        id: 6,
        team_id: 2,
        question_id: 10,
        team_answer: '   ',
      },
    ];
    const teamQuestionQuery = {
      select: vi.fn(() => teamQuestionQuery),
      in: vi.fn((field: string) => {
        if (field === 'team_id') {
          return Promise.resolve({ data: teamQuestionRows, error: null });
        }
        return teamQuestionQuery;
      }),
    };

    const from = vi.fn((table: string) => {
      if (table === 'rallye') return rallyeQuery;
      if (table === 'join_rallye_questions') return joinQuery;
      if (table === 'rallye_team') return teamQuery;
      if (table === 'team_questions') return teamQuestionQuery;
      throw new Error(`Unexpected table ${table}`);
    });

    const createSignedUrl = vi
      .fn()
      .mockResolvedValue({ data: { signedUrl: 'signed-url' }, error: null });
    const storageFrom = vi.fn(() => ({ createSignedUrl }));

    mockCreateClient.mockResolvedValue({
      from,
      storage: { from: storageFrom },
    });

    const { getRallyeUploadAnswers } = await import('./upload-answers');
    const result = await getRallyeUploadAnswers(12);

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error('Expected query to succeed');
    }
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].answers).toEqual([
      {
        teamQuestionId: 5,
        teamId: 1,
        teamName: 'Team Alpha',
        fileName: 'photo.png',
        signedUrl: 'signed-url',
      },
    ]);
    expect(result.data?.[0].teamsWithoutPhoto).toEqual([
      { id: 2, name: 'Team Beta' },
    ]);
    expect(storageFrom).toHaveBeenCalledWith('upload_photo_answers');
    expect(createSignedUrl).toHaveBeenCalledWith('photo.png', 3600);
  });
});
