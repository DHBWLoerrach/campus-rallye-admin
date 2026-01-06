'use client';

import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface UploadPhotoTileProps {
  signedUrl: string;
  teamName: string;
}

export default function UploadPhotoTile({
  signedUrl,
  teamName,
}: UploadPhotoTileProps) {
  const dialogTitle = `Upload von ${teamName}`;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group w-full overflow-hidden rounded-xl border border-border/60 bg-muted/30 text-left transition hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Upload-Foto von ${teamName} vergrößern`}
        >
          <div className="relative aspect-4/3 bg-muted/40">
            <Image
              src={signedUrl}
              alt={`Upload von ${teamName}`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </div>
          <div className="border-t border-border/60 px-3 py-2 text-sm font-medium text-foreground">
            {teamName}
          </div>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription className="sr-only">
            Großansicht des Upload-Fotos.
          </DialogDescription>
        </DialogHeader>
        <div className="relative h-[70vh] w-full overflow-hidden rounded-xl border border-border/60 bg-muted/30">
          <Image
            src={signedUrl}
            alt={`Großansicht von ${teamName}`}
            fill
            sizes="(max-width: 768px) 90vw, 70vw"
            className="object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
