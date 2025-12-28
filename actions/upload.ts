'use server';
import createClient from '@/lib/supabase';
import { requireProfile } from '@/lib/require-profile';

export async function uploadImage(
  base64File: string,
  fileName: string
): Promise<string> {
  await requireProfile();
  const supabase = await createClient();

  const [meta, base64Data] = base64File.split(',');
  if (!base64Data) {
    throw new Error('Invalid base64 file data');
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
    throw new Error('Unsupported file type. Allowed: PNG, JPEG, GIF, WEBP');
  }
  // Größenlimit (z.B. 5 MB)
  const MAX_SIZE = 5 * 1024 * 1024;
  const buffer = Buffer.from(base64Data, 'base64');
  if (buffer.length > MAX_SIZE) {
    throw new Error('File too large. Max 5 MB allowed.');
  }
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
    throw error;
  }
  return uniqueFileName;
}

export async function deleteImage(bucketPath: string): Promise<void> {
  await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase.storage
    .from('question-media')
    .remove([bucketPath]);

  if (error) {
    // todo return error message
    throw error;
  }
}
