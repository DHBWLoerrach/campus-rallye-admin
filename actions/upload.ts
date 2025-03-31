'use server';
import createClient from '@/lib/supabase';

export async function uploadImage(
  base64File: string,
  fileName: string
): Promise<string> {
  const supabase = await createClient();

  // Convert base64 to buffer
  const base64Data = base64File.split(',')[1];
  const buffer = Buffer.from(base64Data, 'base64');

  // Generate unique filename
  const fileExt = fileName.split('.').pop();
  const uniqueFileName = `${Math.random()
    .toString(36)
    .substring(2)}.${fileExt}`;

  // Upload file to Supabase storage
  const { data, error } = await supabase.storage
    .from('question-media')
    .upload(uniqueFileName, buffer, {
      contentType: 'image/*',
    });

  if (error) {
    console.error('Supabase upload error:', error);
    // todo return error message
    throw error;
  }

  return uniqueFileName;
}

export async function deleteImage(bucketPath: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.storage
    .from('question-media')
    .remove([bucketPath]);

  if (error) {
    // todo return error message
    throw error;
  }
}
