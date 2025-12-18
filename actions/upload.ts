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
  const buffer = Buffer.from(base64Data, 'base64');

  // Generate unique filename
  const contentType = meta?.match(/^data:(.+);base64$/)?.[1] ?? 'image/*';
  const fileExt = fileName.includes('.') ? fileName.split('.').pop() : undefined;
  const uniqueFileName = `${Math.random()
    .toString(36)
    .substring(2)}.${fileExt || 'bin'}`;

  // Upload file to Supabase storage
  const { error } = await supabase.storage
    .from('question-media')
    .upload(uniqueFileName, buffer, {
      contentType,
    });

  if (error) {
    console.error('Supabase upload error:', error);
    // todo return error message
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
