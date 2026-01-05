import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import UploadPhotoTile from './UploadPhotoTile';

describe('UploadPhotoTile', () => {
  it('opens a dialog with the enlarged photo', () => {
    render(
      <UploadPhotoTile
        signedUrl="https://example.com/photo.jpg"
        teamName="Team Alpha"
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Upload-Foto von Team Alpha vergrößern',
      })
    );

    expect(
      screen.getByRole('heading', { name: 'Upload von Team Alpha' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Großansicht von Team Alpha' })
    ).toBeInTheDocument();
  });
});
