// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockRequireProfile,
  mockCreateClient,
  mockLoadRallyeUploadPhotos,
  mockCreateSignedUrl,
} = vi.hoisted(() => ({
  mockRequireProfile: vi.fn(),
  mockCreateClient: vi.fn(),
  mockLoadRallyeUploadPhotos: vi.fn(),
  mockCreateSignedUrl: vi.fn(),
}));

vi.mock('@/lib/require-profile', () => ({
  requireProfile: mockRequireProfile,
}));

vi.mock('@/lib/supabase', () => ({
  default: mockCreateClient,
}));

vi.mock('@/lib/rallye-upload-photos', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rallye-upload-photos')>()),
  loadRallyeUploadPhotos: mockLoadRallyeUploadPhotos,
}));

import { readMissingPhotos } from '@/lib/upload-photos-zip';
import { GET } from './route';

const mockFetch = vi.fn();
const mockStorageFrom = vi.fn(() => ({ createSignedUrl: mockCreateSignedUrl }));

function mockRallye(rallye: { id: number; name: string } | null) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn().mockResolvedValue({ data: rallye, error: null }),
  };
  mockCreateClient.mockResolvedValue({
    from: vi.fn(() => query),
    storage: { from: mockStorageFrom },
  });
}

function photo(teamId: number, teamName: string, fileName: string) {
  return {
    teamQuestionId: teamId * 10,
    teamId,
    teamName,
    questionId: 1,
    fileName,
  };
}

function mockPhotos(photos: ReturnType<typeof photo>[]) {
  mockLoadRallyeUploadPhotos.mockResolvedValue({
    success: true,
    data: {
      questions: [{ id: 1, content: 'Foto' }],
      teams: [],
      photos,
    },
  });
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
    mockCreateSignedUrl.mockImplementation(async (path: string) => ({
      data: { signedUrl: `https://supabase.test/sign/${path}` },
      error: null,
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('requires an approved profile before loading any data', async () => {
    mockRequireProfile.mockRejectedValue(new Error('Zugriff verweigert'));

    await expect(callGet('12')).rejects.toThrow('Zugriff verweigert');
    expect(mockCreateClient).not.toHaveBeenCalled();
    expect(mockLoadRallyeUploadPhotos).not.toHaveBeenCalled();
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
    expect(mockLoadRallyeUploadPhotos).not.toHaveBeenCalled();
  });

  it('returns 500 when the photos cannot be loaded', async () => {
    mockRallye({ id: 12, name: 'Rallye' });
    mockLoadRallyeUploadPhotos.mockResolvedValue({
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
    mockPhotos([]);

    const response = await callGet('12');

    expect(response.status).toBe(404);
    expect(await response.text()).toBe('Keine Fotos vorhanden');
  });

  it('streams all team photos as a ZIP download', async () => {
    mockRallye({ id: 12, name: 'Campus Rallye' });
    mockPhotos([
      photo(1, 'Team Alpha', 'a.jpg'),
      photo(2, 'Team Beta', 'b.png'),
    ]);
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
    expect(mockLoadRallyeUploadPhotos).toHaveBeenCalledWith(
      expect.anything(),
      12
    );
    expect(mockStorageFrom).toHaveBeenCalledWith('upload-photos');
    expect(zipText).toContain('Team Alpha.jpg');
    expect(zipText).toContain('content of https://supabase.test/sign/a.jpg');
    expect(zipText).toContain('Team Beta.png');
    expect(zipText).toContain('content of https://supabase.test/sign/b.png');
    expect(zipText).not.toContain('FEHLENDE_FOTOS.txt');
  });

  it('lists a photo that cannot be signed instead of dropping it silently', async () => {
    mockRallye({ id: 12, name: 'Campus Rallye' });
    mockPhotos([
      photo(1, 'Team Alpha', 'a.jpg'),
      photo(2, 'Team Beta', 'b.jpg'),
    ]);
    mockCreateSignedUrl.mockImplementation(async (path: string) =>
      path === 'a.jpg'
        ? { data: null, error: new Error('Object not found') }
        : { data: { signedUrl: `https://supabase.test/sign/${path}` } }
    );
    mockFetch.mockImplementation(async () => new Response('beta photo'));

    const response = await callGet('12');

    expect(response.status).toBe(200);
    const zipText = await readZipText(response);
    expect(zipText).toContain('beta photo');
    expect(zipText).toContain(
      'Diese Fotos konnten nicht heruntergeladen werden:\n\nTeam Alpha.jpg\n'
    );
  });

  it('lists a photo whose download breaks off and keeps adding the others', async () => {
    mockRallye({ id: 12, name: 'Campus Rallye' });
    mockPhotos([
      photo(1, 'Team Alpha', 'a.jpg'),
      photo(2, 'Team Beta', 'b.jpg'),
    ]);
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
    mockPhotos([
      photo(1, 'Team Alpha', 'a.jpg'),
      photo(2, 'Team Beta', 'b.png'),
      photo(3, 'Team Gamma', 'c.jpg'),
    ]);
    mockFetch.mockImplementation(async (url: string) => {
      if (url.endsWith('b.png')) return new Response(null, { status: 404 });
      if (url.endsWith('c.jpg')) throw new Error('network down');
      return new Response('alpha photo');
    });

    const response = await callGet('12');

    expect(response.status).toBe(200);
    const zip = new Uint8Array(await response.arrayBuffer());
    expect(new TextDecoder().decode(zip)).toContain('alpha photo');
    // The reset dialog reads this list back to warn about an incomplete ZIP.
    expect(readMissingPhotos(zip)).toEqual(['Team Beta.png', 'Team Gamma.jpg']);
  });
});
