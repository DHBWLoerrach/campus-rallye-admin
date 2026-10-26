import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadFile, getAttachmentFileName } from './download-file';

describe('getAttachmentFileName', () => {
  it('reads the quoted file name of an attachment', () => {
    expect(getAttachmentFileName('attachment; filename="test-fotos.zip"')).toBe(
      'test-fotos.zip'
    );
  });

  it('returns null without a file name', () => {
    expect(getAttachmentFileName('attachment')).toBeNull();
    expect(getAttachmentFileName(null)).toBeNull();
  });
});

describe('downloadFile', () => {
  const mockFetch = vi.fn();
  let savedFileName: string | null;

  beforeEach(() => {
    savedFileName = null;
    vi.stubGlobal('fetch', mockFetch);
    URL.createObjectURL = vi.fn(() => 'blob:zip');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      savedFileName = this.download;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('saves the complete file under the name sent by the server', async () => {
    mockFetch.mockResolvedValue(
      new Response('zip content', {
        headers: {
          'Content-Disposition': 'attachment; filename="test-fotos.zip"',
        },
      })
    );

    const saved = await downloadFile(
      '/rallyes/5/uploads/download',
      'fallback.zip'
    );

    expect(await saved.text()).toBe('zip content');
    expect(mockFetch).toHaveBeenCalledWith('/rallyes/5/uploads/download', {
      cache: 'no-store',
    });
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(savedFileName).toBe('test-fotos.zip');
  });

  it('falls back to the given name without a Content-Disposition header', async () => {
    mockFetch.mockResolvedValue(new Response('zip content'));

    await downloadFile('/download', 'fallback.zip');

    expect(savedFileName).toBe('fallback.zip');
  });

  it('rejects and saves nothing when the server responds with an error', async () => {
    mockFetch.mockResolvedValue(new Response('Fehler', { status: 500 }));

    await expect(downloadFile('/download', 'fallback.zip')).rejects.toThrow(
      'Download failed with status 500'
    );
    expect(savedFileName).toBeNull();
  });
});
