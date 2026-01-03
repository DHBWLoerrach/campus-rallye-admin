import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QuestionImage from './QuestionImage';

const { mockUploadImage, mockDeleteImage } = vi.hoisted(() => ({
  mockUploadImage: vi.fn(),
  mockDeleteImage: vi.fn(),
}));

vi.mock('@/actions/upload', () => ({
  uploadImage: mockUploadImage,
  deleteImage: mockDeleteImage,
}));

vi.mock('next/image', () => ({
  default: () => null,
}));

class MockFileReader {
  result: string | null = null;
  onload: ((ev: ProgressEvent<FileReader>) => void) | null = null;
  onerror: ((ev: ProgressEvent<FileReader>) => void) | null = null;

  readAsDataURL() {
    this.result = 'data:image/png;base64,AAAA';
    if (this.onload) {
      this.onload({} as ProgressEvent<FileReader>);
    }
  }
}

describe('QuestionImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.FileReader = MockFileReader as unknown as typeof FileReader;
  });

  it('shows an error when the upload fails', async () => {
    mockUploadImage.mockResolvedValue({
      success: false,
      error: 'Upload fehlgeschlagen',
    });

    render(<QuestionImage onImageChange={vi.fn()} />);

    const input = screen.getByLabelText('Bild hochladen');
    const file = new File(['data'], 'photo.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(
      await screen.findByText('Bild konnte nicht hochgeladen werden')
    ).toBeInTheDocument();
    expect(mockUploadImage).toHaveBeenCalledWith(
      'data:image/png;base64,AAAA',
      'photo.png'
    );
  });

  it('shows an error when the delete fails', async () => {
    mockDeleteImage.mockResolvedValue({
      success: false,
      error: 'Löschen fehlgeschlagen',
    });

    render(<QuestionImage bucketPath="foo.png" onImageChange={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Bild entfernen' }));

    expect(
      await screen.findByText('Bild konnte nicht entfernt werden')
    ).toBeInTheDocument();
    expect(mockDeleteImage).toHaveBeenCalledWith('foo.png');
  });
});
