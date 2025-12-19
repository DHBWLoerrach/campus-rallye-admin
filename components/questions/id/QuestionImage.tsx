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

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      setUploading(true);

      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64String = reader.result as string;
          const fileName = await uploadImage(base64String, file.name);
          onImageChange(fileName);
        } catch (error) {
          console.error('Error uploading image:', error);
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error handling image:', error);
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!bucketPath) return;

    try {
      await deleteImage(bucketPath);
      onImageChange(undefined);
    } catch (error) {
      console.error('Error removing image:', error);
    }
  };

  return (
    <div className="space-y-4">
      <Label>Bild</Label>
      <div className="text-sm text-gray-600">
        (Bilder werden sofort hochgeladen)
      </div>

      {bucketPath ? (
        <div className="relative">
          <div className="mt-2 relative w-full h-[200px] flex items-center justify-center">
            <Image
              src={getQuestionMediaPublicUrl(bucketPath)}
              alt="Question image"
              fill
              sizes="(max-width: 768px) 100vw, 200px"
              className="object-contain rounded-md"
            />
          </div>
          <Button
            type="button"
            onClick={handleRemoveImage}
            className="mt-2 bg-red-600 text-white"
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
          <Label
            htmlFor="image-upload"
            className="cursor-pointer inline-block px-4 py-2 bg-blue-600 text-white rounded-md"
          >
            {uploading ? 'Wird hochgeladen...' : 'Bild hochladen'}
          </Label>
        </div>
      )}
    </div>
  );
};

export default QuestionImage;
