// @vitest-environment node
import { downloadZip } from 'client-zip';
import { describe, expect, it } from 'vitest';
import {
  MISSING_PHOTOS_FILE_NAME,
  buildMissingPhotosNote,
  buildPhotoZipEntries,
  getPhotoExtension,
  getPhotoZipFileName,
  parseMissingPhotosNote,
  readMissingPhotos,
  toPhotoBaseName,
} from './upload-photos-zip';

// Builds the archive with the same library and entry types as the route.
async function buildZip(entries: { name: string; input: string }[]) {
  return new Uint8Array(await downloadZip(entries).arrayBuffer());
}

describe('toPhotoBaseName', () => {
  it('keeps umlauts and regular punctuation', () => {
    expect(toPhotoBaseName('Die Überflieger!')).toBe('Die Überflieger!');
  });

  it('replaces characters that are invalid in file names', () => {
    expect(toPhotoBaseName('A/B\\C:D*E?F"G<H>I|J')).toBe('A_B_C_D_E_F_G_H_I_J');
  });

  it('prevents hidden files and parent directory names', () => {
    expect(toPhotoBaseName('..')).toBe('Team');
    expect(toPhotoBaseName('.hidden')).toBe('hidden');
  });

  it('falls back to a generic name for blank team names', () => {
    expect(toPhotoBaseName('   ')).toBe('Team');
  });

  it('collapses whitespace and limits the length', () => {
    expect(toPhotoBaseName('  Team \n  Alpha ')).toBe('Team Alpha');
    expect(toPhotoBaseName('x'.repeat(300))).toHaveLength(100);
  });
});

describe('getPhotoExtension', () => {
  it('returns the lowercased extension of the storage path', () => {
    expect(getPhotoExtension('12/abc.JPG')).toBe('.jpg');
    expect(getPhotoExtension('photo.webp')).toBe('.webp');
  });

  it('drops missing or unusual extensions', () => {
    expect(getPhotoExtension('photo')).toBe('');
    expect(getPhotoExtension('photo.j-pg')).toBe('');
  });
});

describe('buildPhotoZipEntries', () => {
  it('names photos after their team with the original extension', () => {
    const photos = [
      { teamName: 'Team Alpha', fileName: 'a.jpg' },
      { teamName: 'Team Beta', fileName: 'b.png' },
    ];

    expect(buildPhotoZipEntries(photos)).toEqual([
      { name: 'Team Alpha.jpg', photo: photos[0] },
      { name: 'Team Beta.png', photo: photos[1] },
    ]);
  });

  it('numbers names that would collide, ignoring case', () => {
    const entries = buildPhotoZipEntries([
      { teamName: 'A/B', fileName: '1.jpg' },
      { teamName: 'A:B', fileName: '2.jpg' },
      { teamName: 'a_b', fileName: '3.jpg' },
      { teamName: 'A/B', fileName: '4.png' },
    ]);

    expect(entries.map((entry) => entry.name)).toEqual([
      'A_B.jpg',
      'A_B (2).jpg',
      'a_b (3).jpg',
      'A_B.png',
    ]);
  });
});

describe('getPhotoZipFileName', () => {
  it('builds an ASCII file name from the rallye name', () => {
    expect(getPhotoZipFileName('Erstsemester-Rallye Lörrach 2026')).toBe(
      'erstsemester-rallye-loerrach-2026-fotos.zip'
    );
  });
});

describe('buildMissingPhotosNote', () => {
  it('lists the missing photos', () => {
    expect(buildMissingPhotosNote(['Team Alpha.jpg', 'Team Beta.png'])).toBe(
      'Diese Fotos konnten nicht heruntergeladen werden:\n\nTeam Alpha.jpg\nTeam Beta.png\n'
    );
  });
});

describe('parseMissingPhotosNote', () => {
  it('reads back the names written by buildMissingPhotosNote', () => {
    const names = ['Team Alpha.jpg', 'Die Überflieger.png'];

    expect(parseMissingPhotosNote(buildMissingPhotosNote(names))).toEqual(
      names
    );
  });
});

describe('readMissingPhotos', () => {
  it('lists the photos from the missing photos note of the ZIP', async () => {
    const zip = await buildZip([
      { name: 'Team Alpha.jpg', input: 'alpha photo' },
      {
        name: MISSING_PHOTOS_FILE_NAME,
        input: buildMissingPhotosNote(['Team Beta.jpg', 'Die Überflieger.png']),
      },
    ]);

    expect(readMissingPhotos(zip)).toEqual([
      'Team Beta.jpg',
      'Die Überflieger.png',
    ]);
  });

  it('returns an empty list for a complete ZIP', async () => {
    const zip = await buildZip([
      { name: 'Team Alpha.jpg', input: 'alpha photo' },
      { name: 'Team Beta.jpg', input: 'beta photo' },
    ]);

    expect(readMissingPhotos(zip)).toEqual([]);
  });

  it('returns null for data that is not a readable ZIP', async () => {
    const zip = await buildZip([
      { name: MISSING_PHOTOS_FILE_NAME, input: buildMissingPhotosNote(['A']) },
    ]);

    expect(readMissingPhotos(new TextEncoder().encode('Fehler'))).toBeNull();
    expect(readMissingPhotos(zip.subarray(0, zip.length - 1))).toBeNull();
  });
});
