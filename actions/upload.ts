'use server';
import createClient from '@/lib/supabase';
import { requireProfile } from '@/lib/require-profile';
import { fail, ok, type ActionResult } from '@/lib/action-result';

export async function uploadImage(
  base64File: string,
  fileName: string
): Promise<ActionResult<{ fileName: string }>> {
  await requireProfile();

  const [meta, base64Data] = base64File.split(',');
  if (!base64Data) {
    return fail('Ungültige Datei');
  }
  // MIME-Type Whitelist (nur Bilder erlaubt)
  const allowedTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
  ];
  const contentType = meta?.match(/^data:(.+);base64$/)?.[1] ?? '';
  if (!allowedTypes.includes(contentType)) {
    return fail('Dateityp nicht unterstützt');
  }
  // Größenlimit (z.B. 5 MB)
  const MAX_SIZE = 5 * 1024 * 1024;
  const buffer = Buffer.from(base64Data, 'base64');
  if (buffer.length > MAX_SIZE) {
    return fail('Datei ist zu groß');
  }
  const supabase = await createClient();
  // Generate unique filename
  const fileExt = fileName.includes('.')
    ? fileName.split('.').pop()
    : undefined;
  const uniqueFileName = `${Math.random().toString(36).substring(2)}.${
    fileExt || 'bin'
  }`;
  // Upload file to Supabase storage
  const { error } = await supabase.storage
    .from('question-media')
    .upload(uniqueFileName, buffer, {
      contentType,
    });
  if (error) {
    console.error('Supabase upload error:', error);
    return fail('Upload fehlgeschlagen');
  }
  return ok({ fileName: uniqueFileName });
}

export async function deleteImage(
  bucketPath: string
): Promise<ActionResult<{ message: string }>> {
  await requireProfile();

  if (!bucketPath || bucketPath.trim().length === 0) {
    return fail('Ungültiger Dateipfad');
  }
  const supabase = await createClient();

  const { error } = await supabase.storage
    .from('question-media')
    .remove([bucketPath]);

  if (error) {
    console.error('Supabase delete error:', error);
    return fail('Löschen fehlgeschlagen');
  }
  return ok({ message: 'Bild gelöscht' });
}
