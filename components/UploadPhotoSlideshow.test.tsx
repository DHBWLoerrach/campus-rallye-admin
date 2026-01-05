import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import UploadPhotoSlideshow, {
  SLIDESHOW_INTERVAL_MS,
} from './UploadPhotoSlideshow';

describe('UploadPhotoSlideshow', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('advances slides manually and automatically', () => {
    vi.useFakeTimers();

    render(
      <UploadPhotoSlideshow
        questionContent="Upload-Frage"
        photos={[
          { signedUrl: 'https://example.com/a.jpg', teamName: 'Team A' },
          { signedUrl: 'https://example.com/b.jpg', teamName: 'Team B' },
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Slideshow starten' }));

    expect(
      screen.getByRole('img', { name: 'Slideshow-Foto von Team A' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Nächstes Foto' }));
    expect(
      screen.getByRole('img', { name: 'Slideshow-Foto von Team B' })
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(SLIDESHOW_INTERVAL_MS);
    });

    expect(
      screen.getByRole('img', { name: 'Slideshow-Foto von Team A' })
    ).toBeInTheDocument();
  });
});
