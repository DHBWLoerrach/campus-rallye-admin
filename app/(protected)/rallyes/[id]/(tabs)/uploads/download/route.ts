// Despite its name, client-zip only relies on Web Streams and Response, which
// Node provides, so it runs here on the server (covered by route.test.ts).
import { downloadZip } from 'client-zip';
import {
  getRallyeUploadAnswers,
  type UploadAnswer,
} from '@/actions/upload-answers';
import createClient from '@/lib/supabase';
import { requireProfile } from '@/lib/require-profile';
import {
  MISSING_PHOTOS_FILE_NAME,
  buildMissingPhotosNote,
  buildPhotoZipEntries,
  getPhotoZipFileName,
  type UploadPhotoZipEntry,
} from '@/lib/upload-photos-zip';

interface RouteProps {
  params: Promise<{ id: string }>;
}

function textResponse(status: number, message: string) {
  return new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

// Photos are fetched lazily while the ZIP streams, so only one photo is in
// memory at a time. The response has already started by then, so a photo that
// cannot be fetched is listed in a note inside the ZIP instead of failing it.
// Each photo is read completely before it is added: a stream error while
// client-zip reads it would otherwise abort the whole ZIP.
async function* zipInputs(entries: UploadPhotoZipEntry<UploadAnswer>[]) {
  const missing: string[] = [];
  for (const { name, photo } of entries) {
    let input: Uint8Array;
    let lastModified: Date | undefined;
    try {
      const response = await fetch(photo.signedUrl, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Unexpected status ${response.status}`);
      }
      input = new Uint8Array(await response.arrayBuffer());
      const lastModifiedHeader = response.headers.get('Last-Modified');
      const parsedDate = new Date(lastModifiedHeader ?? '');
      lastModified = isNaN(parsedDate.getTime()) ? undefined : parsedDate;
    } catch (error) {
      console.error('Error fetching upload photo for ZIP:', {
        teamId: photo.teamId,
        fileName: photo.fileName,
        error,
      });
      missing.push(name);
      continue;
    }
    yield { name, input, lastModified };
  }
  if (missing.length > 0) {
    yield {
      name: MISSING_PHOTOS_FILE_NAME,
      input: buildMissingPhotosNote(missing),
    };
  }
}

export async function GET(_request: Request, { params }: RouteProps) {
  await requireProfile();

  const { id: idStr } = await params;
  if (!/^\d+$/.test(idStr)) {
    return textResponse(404, 'Rallye nicht gefunden');
  }
  const rallyeId = Number(idStr);

  const supabase = await createClient();
  const { data: rallye, error } = await supabase
    .from('rallyes')
    .select('id, name')
    .eq('id', rallyeId)
    .maybeSingle();
  if (error) {
    console.error('Error loading rallye for photo download:', error);
    return textResponse(500, 'Rallye konnte nicht geladen werden');
  }
  if (!rallye) {
    return textResponse(404, 'Rallye nicht gefunden');
  }

  const uploadResult = await getRallyeUploadAnswers(rallyeId);
  if (!uploadResult.success) {
    return textResponse(500, uploadResult.error);
  }

  const photos = (uploadResult.data ?? []).flatMap(
    (question) => question.uploadAnswers
  );
  if (photos.length === 0) {
    return textResponse(404, 'Keine Fotos vorhanden');
  }

  const zip = downloadZip(zipInputs(buildPhotoZipEntries(photos)));
  return new Response(zip.body, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${getPhotoZipFileName(rallye.name)}"`,
      'Cache-Control': 'no-store',
    },
  });
}
