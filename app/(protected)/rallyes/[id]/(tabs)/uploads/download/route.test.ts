// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRequireProfile, mockCreateClient, mockGetRallyeUploadAnswers } =
  vi.hoisted(() => ({
    mockRequireProfile: vi.fn(),
    mockCreateClient: vi.fn(),
    mockGetRallyeUploadAnswers: vi.fn(),
  }));

vi.mock('@/lib/require-profile', () => ({
  requireProfile: mockRequireProfile,
}));

vi.mock('@/lib/supabase', () => ({
  default: mockCreateClient,
}));

vi.mock('@/actions/upload-answers', () => ({
  getRallyeUploadAnswers: mockGetRallyeUploadAnswers,
}));

import { GET } from './route';

const mockFetch = vi.fn();

function mockRallye(rallye: { id: number; name: string } | null) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue({ data: rallye, error: null }),
  };
  mockCreateClient.mockResolvedValue({ from: vi.fn(() => query) });
}

function uploadAnswer(teamId: number, teamName: string, fileName: string) {
  return {
    teamQuestionId: teamId * 10,
    teamId,
    teamName,
    fileName,
    signedUrl: `https://supabase.test/sign/${fileName}`,
  };
}

function callGet(id: string) {
  return GET(new Request(`http://localhost/rallyes/${id}/uploads/download`), {
    params: Promise.resolve({ id }),
  });
}

// Entries are stored uncompressed, so names and contents appear verbatim.
async function readZipText(response: Response) {
  return new TextDecoder().decode(await response.arrayBuffer());
}

describe('GET /rallyes/[id]/uploads/download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('requires an approved profile before loading any data', async () => {
    mockRequireProfile.mockRejectedValue(new Error('Zugriff verweigert'));

    await expect(callGet('12')).rejects.toThrow('Zugriff verweigert');
    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(mockGetRallyeUploadAnswers).not.toHaveBeenCalled();
  });

  it('returns 404 for an invalid rallye id', async () => {
    const response = await callGet('abc');

    expect(response.status).toBe(404);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('returns 404 when the rallye does not exist', async () => {
    mockRallye(null);

    const response = await callGet('12');

    expect(response.status).toBe(404);
    expect(mockGetRallyeUploadAnswers).not.toHaveBeenCalled();
  });

  it('returns 500 when the upload answers cannot be loaded', async () => {
    mockRallye({ id: 12, name: 'Rallye' });
    mockGetRallyeUploadAnswers.mockResolvedValue({
      success: false,
      error: 'Upload-Antworten konnten nicht geladen werden',
    });

    const response = await callGet('12');

    expect(response.status).toBe(500);
    expect(await response.text()).toBe(
      'Upload-Antworten konnten nicht geladen werden'
    );
  });

  it('returns 404 when no team uploaded a photo', async () => {
    mockRallye({ id: 12, name: 'Rallye' });
    mockGetRallyeUploadAnswers.mockResolvedValue({
      success: true,
      data: [
        { id: 1, content: 'Foto', uploadAnswers: [], teamsWithoutPhoto: [] },
      ],
    });

    const response = await callGet('12');

    expect(response.status).toBe(404);
    expect(await response.text()).toBe('Keine Fotos vorhanden');
  });

  it('streams all team photos as a ZIP download', async () => {
    mockRallye({ id: 12, name: 'Campus Rallye' });
    mockGetRallyeUploadAnswers.mockResolvedValue({
      success: true,
      data: [
        {
          id: 1,
          content: 'Foto',
          uploadAnswers: [
            uploadAnswer(1, 'Team Alpha', 'a.jpg'),
            uploadAnswer(2, 'Team Beta', 'b.png'),
          ],
          teamsWithoutPhoto: [],
        },
      ],
    });
    mockFetch.mockImplementation(
      async (url: string) => new Response(`content of ${url}`)
    );

    const response = await callGet('12');

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/zip');
    expect(response.headers.get('Content-Disposition')).toBe(
      'attachment; filename="campus-rallye-fotos.zip"'
    );
    const zipText = await readZipText(response);
    expect(zipText).toContain('Team Alpha.jpg');
    expect(zipText).toContain('content of https://supabase.test/sign/a.jpg');
    expect(zipText).toContain('Team Beta.png');
    expect(zipText).toContain('content of https://supabase.test/sign/b.png');
    expect(zipText).not.toContain('FEHLENDE_FOTOS.txt');
  });

  it('lists a photo whose download breaks off and keeps adding the others', async () => {
    mockRallye({ id: 12, name: 'Campus Rallye' });
    mockGetRallyeUploadAnswers.mockResolvedValue({
      success: true,
      data: [
        {
          id: 1,
          content: 'Foto',
          uploadAnswers: [
            uploadAnswer(1, 'Team Alpha', 'a.jpg'),
            uploadAnswer(2, 'Team Beta', 'b.jpg'),
          ],
          teamsWithoutPhoto: [],
        },
      ],
    });
    mockFetch.mockImplementation(async (url: string) => {
      if (url.endsWith('b.jpg')) return new Response('beta photo');
      // Status 200, but the connection breaks off after the first chunk.
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('alpha part'));
          controller.error(new Error('connection reset'));
        },
      });
      return new Response(body);
    });

    const response = await callGet('12');

    expect(response.status).toBe(200);
    const zipText = await readZipText(response);
    expect(zipText).toContain('beta photo');
    expect(zipText).not.toContain('alpha part');
    expect(zipText).toContain(
      'Diese Fotos konnten nicht heruntergeladen werden:\n\nTeam Alpha.jpg\n'
    );
  });

  it('lists photos that cannot be fetched instead of failing the ZIP', async () => {
    mockRallye({ id: 12, name: 'Campus Rallye' });
    mockGetRallyeUploadAnswers.mockResolvedValue({
      success: true,
      data: [
        {
          id: 1,
          content: 'Foto',
          uploadAnswers: [
            uploadAnswer(1, 'Team Alpha', 'a.jpg'),
            uploadAnswer(2, 'Team Beta', 'b.png'),
            uploadAnswer(3, 'Team Gamma', 'c.jpg'),
          ],
          teamsWithoutPhoto: [],
        },
      ],
    });
    mockFetch.mockImplementation(async (url: string) => {
      if (url.endsWith('b.png')) return new Response(null, { status: 404 });
      if (url.endsWith('c.jpg')) throw new Error('network down');
      return new Response('alpha photo');
    });

    const response = await callGet('12');

    expect(response.status).toBe(200);
    const zipText = await readZipText(response);
    expect(zipText).toContain('alpha photo');
    expect(zipText).toContain(
      'Diese Fotos konnten nicht heruntergeladen werden:\n\nTeam Beta.png\nTeam Gamma.jpg\n'
    );
  });
});
