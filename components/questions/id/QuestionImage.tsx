import { useState } from 'react';
import Image from 'next/image';
import { uploadImage, deleteImage } from '@/actions/upload';
import { Button, buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { getQuestionMediaPublicUrl } from '@/lib/supabase-public';

interface QuestionImageProps {
  bucketPath?: string;
  persistedBucketPath?: string;
  onImageChange: (newPath: string | undefined) => void;
}

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
]);
const ACCEPTED_IMAGE_TYPES = Array.from(ALLOWED_IMAGE_TYPES).join(',');

const QuestionImage: React.FC<QuestionImageProps> = ({
  bucketPath,
  persistedBucketPath,
  onImageChange,
}) => {
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      setErrorMessage(null);

      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        setErrorMessage(
          'Dateityp nicht unterstützt. Erlaubt sind PNG, JPG, GIF und WebP.'
        );
        return;
      }

      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setErrorMessage('Das Bild darf maximal 5 MB groß sein.');
        return;
      }

      setUploading(true);

      const formData = new FormData();
      formData.set('file', file);
      const result = await uploadImage(formData);
      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }
      if (result.data?.fileName) {
        onImageChange(result.data.fileName);
        setErrorMessage(null);
        return;
      }
      throw new Error('Missing file name');
    } catch (error) {
      console.error('Error handling image:', error);
      setErrorMessage('Bild konnte nicht hochgeladen werden');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!bucketPath) return;
    if (bucketPath === persistedBucketPath) {
      onImageChange(undefined);
      return;
    }

    try {
      setErrorMessage(null);
      const result = await deleteImage(bucketPath);
      if (!result.success) {
        throw new Error(result.error);
      }
      onImageChange(undefined);
    } catch (error) {
      console.error('Error removing image:', error);
      setErrorMessage('Bild konnte nicht entfernt werden');
    }
  };

  return (
    <div className="space-y-3">
      <Label>Bild</Label>
      <p className="text-xs text-muted-foreground">
        PNG, JPG, GIF oder WebP · maximal 5 MB. Bilder werden sofort
        hochgeladen.
      </p>
      {errorMessage && (
        <p className="text-xs text-destructive" role="alert">
          {errorMessage}
        </p>
      )}

      {bucketPath ? (
        <div className="space-y-3">
          <div className="relative rounded-xl border border-border/60 bg-muted/30 p-3">
            <div className="relative h-50 w-full">
              <Image
                src={getQuestionMediaPublicUrl(bucketPath)}
                alt="Question image"
                fill
                sizes="(max-width: 768px) 100vw, 200px"
                className="object-contain"
              />
            </div>
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleRemoveImage}
          >
            Bild entfernen
          </Button>
        </div>
      ) : (
        <div>
          <input
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            onChange={handleImageUpload}
            disabled={uploading}
            className="hidden"
            id="image-upload"
          />
          <Label
            htmlFor="image-upload"
            className={buttonVariants({
              variant: 'outline',
              size: 'sm',
              className: 'cursor-pointer',
            })}
          >
            {uploading ? 'Wird hochgeladen...' : 'Bild hochladen'}
          </Label>
        </div>
      )}
    </div>
  );
};

export default QuestionImage;
