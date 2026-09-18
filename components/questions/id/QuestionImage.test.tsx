import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

describe('QuestionImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the server error when the upload fails', async () => {
    mockUploadImage.mockResolvedValue({
      success: false,
      error: 'Upload fehlgeschlagen',
    });

    render(<QuestionImage onImageChange={vi.fn()} />);

    const input = screen.getByLabelText('Bild hochladen');
    const file = new File(['data'], 'photo.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(
      await screen.findByText('Upload fehlgeschlagen')
    ).toBeInTheDocument();
    expect(mockUploadImage).toHaveBeenCalledOnce();
    const formData = mockUploadImage.mock.calls[0][0] as FormData;
    expect(formData.get('file')).toBe(file);
  });

  it('rejects unsupported image types before uploading', () => {
    render(<QuestionImage onImageChange={vi.fn()} />);

    const input = screen.getByLabelText('Bild hochladen');
    const file = new File(['data'], 'photo.svg', { type: 'image/svg+xml' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Dateityp nicht unterstützt. Erlaubt sind PNG, JPG, GIF und WebP.'
    );
    expect(mockUploadImage).not.toHaveBeenCalled();
  });

  it('rejects images larger than 5 MB before uploading', () => {
    render(<QuestionImage onImageChange={vi.fn()} />);

    const input = screen.getByLabelText('Bild hochladen');
    const file = new File(['data'], 'photo.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 + 1 });
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Das Bild darf maximal 5 MB groß sein.'
    );
    expect(mockUploadImage).not.toHaveBeenCalled();
  });

  it('shows the supported formats and file size limit', () => {
    render(<QuestionImage onImageChange={vi.fn()} />);

    expect(
      screen.getByText(
        'PNG, JPG, GIF oder WebP · maximal 5 MB. Bilder werden sofort hochgeladen.'
      )
    ).toBeInTheDocument();
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

  it('defers deleting a persisted image until the question is saved', async () => {
    const onImageChange = vi.fn();

    render(
      <QuestionImage
        bucketPath="stored.png"
        persistedBucketPath="stored.png"
        onImageChange={onImageChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Bild entfernen' }));

    await waitFor(() => expect(onImageChange).toHaveBeenCalledWith(undefined));
    expect(mockDeleteImage).not.toHaveBeenCalled();
  });
});
