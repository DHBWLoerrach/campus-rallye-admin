'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export type UploadSlideshowPhoto = {
  signedUrl: string;
  teamName: string;
};

const SLIDESHOW_INTERVAL_MS = 5000;

interface UploadPhotoSlideshowProps {
  questionContent: string;
  photos: UploadSlideshowPhoto[];
}

export default function UploadPhotoSlideshow({
  questionContent,
  photos,
}: UploadPhotoSlideshowProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const photoCount = photos.length;
  const hasMultiple = photoCount > 1;

  const currentPhoto = useMemo(() => {
    if (photoCount === 0) return null;
    return photos[index] ?? photos[0];
  }, [index, photoCount, photos]);

  const goNext = useCallback(() => {
    if (photoCount === 0) return;
    setIndex((prev) => (prev + 1) % photoCount);
  }, [photoCount]);

  const goPrev = useCallback(() => {
    if (photoCount === 0) return;
    setIndex((prev) => (prev - 1 + photoCount) % photoCount);
  }, [photoCount]);

  useEffect(() => {
    if (!open || !isPlaying || photoCount < 2) return;
    const intervalId = window.setInterval(() => {
      goNext();
    }, SLIDESHOW_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [open, isPlaying, photoCount, goNext]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, goNext, goPrev]);

  if (photoCount === 0 || !currentPhoto) {
    return null;
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setIndex(0);
      setIsPlaying(hasMultiple);
    } else {
      setIsPlaying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Slideshow starten
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-[100dvh] w-screen max-w-none flex-col gap-0 overflow-hidden border-0 p-0 shadow-none sm:rounded-none">
        <DialogHeader className="border-b border-border/60 bg-card/95 pl-4 pr-12 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1 text-left">
              <DialogTitle className="text-base font-semibold">
                Upload-Slideshow
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {questionContent}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Foto {index + 1} von {photoCount}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPlaying((prev) => !prev)}
                disabled={!hasMultiple}
                aria-pressed={isPlaying}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Play className="h-4 w-4" aria-hidden="true" />
                )}
                <span className="ml-2 text-xs">
                  {isPlaying ? 'Pause' : 'Weiter'}
                </span>
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="relative flex-1 bg-black/90">
          <Image
            src={currentPhoto.signedUrl}
            alt={`Slideshow-Foto von ${currentPhoto.teamName}`}
            fill
            sizes="100vw"
            className="object-contain"
          />
          <div className="absolute bottom-4 left-4 rounded-full bg-background/80 px-3 py-1 text-sm font-medium text-foreground shadow-sm backdrop-blur">
            {currentPhoto.teamName}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute left-4 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur hover:bg-background"
            onClick={goPrev}
            disabled={!hasMultiple}
            aria-label="Vorheriges Foto"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute right-4 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur hover:bg-background"
            onClick={goNext}
            disabled={!hasMultiple}
            aria-label="Nächstes Foto"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { SLIDESHOW_INTERVAL_MS };
