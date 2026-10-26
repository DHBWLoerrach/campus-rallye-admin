import { slugify } from './slug';

export const MISSING_PHOTOS_FILE_NAME = 'FEHLENDE_FOTOS.txt';

const MAX_BASE_NAME_LENGTH = 100;
const FALLBACK_BASE_NAME = 'Team';

export interface UploadPhotoSource {
  teamName: string;
  fileName: string;
}

export interface UploadPhotoZipEntry<T extends UploadPhotoSource> {
  name: string;
  photo: T;
}

// Team names are free text, so characters that are invalid in file names on
// common systems (or would create folders inside the ZIP) are replaced.
// Umlauts are kept: the ZIP marks entry names as UTF-8.
export function toPhotoBaseName(teamName: string): string {
  const sanitized = teamName
    .replace(/\s+/g, ' ')
    .replace(/[\u0000-\u001f\u007f/\\:*?"<>|]/g, '_')
    .trim()
    .replace(/^\.+/, '')
    .slice(0, MAX_BASE_NAME_LENGTH)
    .trim();
  return sanitized || FALLBACK_BASE_NAME;
}

// The extension comes from the storage path; anything unusual is dropped
// rather than trusted.
export function getPhotoExtension(fileName: string): string {
  const match = /\.([a-z0-9]{1,5})$/i.exec(fileName);
  return match ? `.${match[1].toLowerCase()}` : '';
}

// Names each photo after its team. Duplicate names (e.g. two teams that only
// differ in characters replaced above) get a running number, so no entry
// overwrites another when the ZIP is extracted.
export function buildPhotoZipEntries<T extends UploadPhotoSource>(
  photos: T[]
): UploadPhotoZipEntry<T>[] {
  const usedNames = new Set<string>();
  return photos.map((photo) => {
    const baseName = toPhotoBaseName(photo.teamName);
    const extension = getPhotoExtension(photo.fileName);
    let name = `${baseName}${extension}`;
    for (let counter = 2; usedNames.has(name.toLowerCase()); counter++) {
      name = `${baseName} (${counter})${extension}`;
    }
    usedNames.add(name.toLowerCase());
    return { name, photo };
  });
}

export function getPhotoZipFileName(rallyeName: string): string {
  return `${slugify(rallyeName)}-fotos.zip`;
}

export function buildMissingPhotosNote(entryNames: string[]): string {
  return [
    'Diese Fotos konnten nicht heruntergeladen werden:',
    '',
    ...entryNames,
    '',
  ].join('\n');
}
