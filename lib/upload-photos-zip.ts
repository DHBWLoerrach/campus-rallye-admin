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

const MISSING_PHOTOS_NOTE_HEADER =
  'Diese Fotos konnten nicht heruntergeladen werden:';

export function buildMissingPhotosNote(entryNames: string[]): string {
  return [MISSING_PHOTOS_NOTE_HEADER, '', ...entryNames, ''].join('\n');
}

export function parseMissingPhotosNote(note: string): string[] {
  return note
    .split('\n')
    .slice(1)
    .filter((line) => line.length > 0);
}

const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const ZIP64_MARKER = 0xffffffff;

// Returns the photos listed in the missing photos note of a photo ZIP: an
// empty list when there is no note, null when the archive cannot be read.
// Only handles what the download route produces: uncompressed entries in an
// archive below the ZIP64 limits.
export function readMissingPhotos(zip: Uint8Array): string[] | null {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const decoder = new TextDecoder();

  const endOffset = zip.byteLength - 22;
  if (
    endOffset < 0 ||
    view.getUint32(endOffset, true) !== END_OF_CENTRAL_DIRECTORY_SIGNATURE
  ) {
    return null;
  }
  const entryCount = view.getUint16(endOffset + 10, true);
  let offset = view.getUint32(endOffset + 16, true);
  if (offset === ZIP64_MARKER) return null;

  try {
    for (let index = 0; index < entryCount; index++) {
      if (view.getUint32(offset, true) !== CENTRAL_DIRECTORY_SIGNATURE) {
        return null;
      }
      const size = view.getUint32(offset + 20, true);
      const nameLength = view.getUint16(offset + 28, true);
      const extraLength = view.getUint16(offset + 30, true);
      const commentLength = view.getUint16(offset + 32, true);
      const localOffset = view.getUint32(offset + 42, true);
      const name = decoder.decode(
        zip.subarray(offset + 46, offset + 46 + nameLength)
      );

      if (name === MISSING_PHOTOS_FILE_NAME) {
        if (view.getUint32(localOffset, true) !== LOCAL_FILE_HEADER_SIGNATURE) {
          return null;
        }
        const dataOffset =
          localOffset +
          30 +
          view.getUint16(localOffset + 26, true) +
          view.getUint16(localOffset + 28, true);
        return parseMissingPhotosNote(
          decoder.decode(zip.subarray(dataOffset, dataOffset + size))
        );
      }
      offset += 46 + nameLength + extraLength + commentLength;
    }
  } catch {
    // DataView throws a RangeError for offsets outside a truncated archive.
    return null;
  }
  return [];
}
