import { useState } from 'react';
import Image from 'next/image';
import { uploadImage, deleteImage } from '@/actions/upload';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { getQuestionMediaPublicUrl } from '@/lib/supabase-public';

interface QuestionImageProps {
  bucketPath?: string;
  onImageChange: (newPath: string | undefined) => void;
}

const QuestionImage: React.FC<QuestionImageProps> = ({
  bucketPath,
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
      setUploading(true);
      setErrorMessage(null);

      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64String = reader.result as string;
          const result = await uploadImage(base64String, file.name);
          if (!result.success) {
            throw new Error(result.error);
          }
          if (result.data?.fileName) {
            onImageChange(result.data.fileName);
            setErrorMessage(null);
            return;
          }
          throw new Error('Missing file name');
        } catch (error) {
          console.error('Error uploading image:', error);
          setErrorMessage('Bild konnte nicht hochgeladen werden');
        } finally {
          setUploading(false);
        }
      };
      reader.onerror = () => {
        console.error('Error reading image file');
        setErrorMessage('Bild konnte nicht gelesen werden');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error handling image:', error);
      setErrorMessage('Bild konnte nicht hochgeladen werden');
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!bucketPath) return;

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
        Bilder werden sofort hochgeladen.
      </p>
      {errorMessage && (
        <p className="text-xs text-destructive">{errorMessage}</p>
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
            accept="image/*"
            onChange={handleImageUpload}
            disabled={uploading}
            className="hidden"
            id="image-upload"
          />
          <Button asChild variant="outline" size="sm">
            <Label htmlFor="image-upload" className="cursor-pointer">
              {uploading ? 'Wird hochgeladen...' : 'Bild hochladen'}
            </Label>
          </Button>
        </div>
      )}
    </div>
  );
};

export default QuestionImage;
