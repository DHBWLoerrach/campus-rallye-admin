import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UploadsPage from './page';

const { createClient, getRallyeUploadAnswers, rallyeQuery } = vi.hoisted(
  () => ({
    createClient: vi.fn(),
    getRallyeUploadAnswers: vi.fn(),
    rallyeQuery: { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() },
  })
);
vi.mock('@/lib/supabase', () => ({ default: createClient }));
vi.mock('@/actions/upload-answers', () => ({ getRallyeUploadAnswers }));

function uploadAnswer(teamId: number, teamName: string) {
  return {
    teamQuestionId: teamId * 10,
    teamId,
    teamName,
    fileName: `${teamId}.jpg`,
    signedUrl: `https://supabase.test/sign/${teamId}.jpg`,
  };
}

function mockUploadAnswers(uploadAnswers: ReturnType<typeof uploadAnswer>[]) {
  getRallyeUploadAnswers.mockResolvedValue({
    success: true,
    data: [
      {
        id: 1,
        content: 'Macht ein Foto am Hörsaalgebäude',
        uploadAnswers,
        teamsWithoutPhoto: [],
      },
    ],
  });
}

function renderPage() {
  return UploadsPage({ params: Promise.resolve({ id: '5' }) }).then(render);
}

beforeEach(() => {
  vi.resetAllMocks();
  rallyeQuery.select.mockReturnValue(rallyeQuery);
  rallyeQuery.eq.mockReturnValue(rallyeQuery);
  rallyeQuery.maybeSingle.mockResolvedValue({
    data: { id: 5, name: 'Meine Rallye' },
    error: null,
  });
  createClient.mockResolvedValue({ from: () => rallyeQuery });
});

describe('UploadsPage photo download', () => {
  it('offers all photos of the rallye as a ZIP download', async () => {
    mockUploadAnswers([
      uploadAnswer(1, 'Team Alpha'),
      uploadAnswer(2, 'Team Beta'),
    ]);

    await renderPage();

    expect(
      screen.getByRole('link', { name: '2 Fotos herunterladen (ZIP)' })
    ).toHaveAttribute('href', '/rallyes/5/uploads/download');
  });

  it('uses the singular for a single photo', async () => {
    mockUploadAnswers([uploadAnswer(1, 'Team Alpha')]);

    await renderPage();

    expect(
      screen.getByRole('link', { name: '1 Foto herunterladen (ZIP)' })
    ).toBeInTheDocument();
  });

  it('offers no download while no team has uploaded a photo', async () => {
    mockUploadAnswers([]);

    await renderPage();

    expect(
      screen.getByText('Noch keine Fotos hochgeladen.')
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /herunterladen/ })
    ).not.toBeInTheDocument();
  });
});
