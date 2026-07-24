import type { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import QuestionPreview from './QuestionPreview';

vi.mock('next/image', () => ({
  default: ({
    fill,
    alt,
    ...props
  }: ComponentProps<'img'> & { fill?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt ?? ''} data-fill={fill ? 'true' : undefined} {...props} />
  ),
}));

describe('QuestionPreview', () => {
  it('shows multiple-choice solution options without revealing the correct one', () => {
    render(
      <QuestionPreview
        data={{
          content: 'Wo befindet sich die Mensa?',
          type: 'multiple_choice',
          solutionOptions: [
            { correct: true, text: 'Gebäude A' },
            { correct: false, text: 'Gebäude B' },
          ],
        }}
      />
    );

    expect(
      screen.getByRole('heading', { name: 'Wo befindet sich die Mensa?' })
    ).toBeInTheDocument();
    expect(screen.getByText('Gebäude A')).toBeInTheDocument();
    expect(screen.getByText('Gebäude B')).toBeInTheDocument();
    expect(screen.queryByText(/richtig/i)).not.toBeInTheDocument();
  });

  it('shows the question image for a picture question', () => {
    render(
      <QuestionPreview
        data={{
          content: 'Welches Gebäude ist abgebildet?',
          type: 'picture',
          bucket_path: 'questions/campus.jpg',
        }}
      />
    );

    expect(
      screen.getByRole('img', {
        name: 'Fragebild: Welches Gebäude ist abgebildet?',
      })
    ).toBeInTheDocument();
    expect(screen.getByText('Antwort eingeben')).toBeInTheDocument();
  });

  it('shows a scanner prompt without revealing the QR solution', () => {
    render(
      <QuestionPreview
        data={{
          content: 'Finde den Code an der Bibliothek.',
          type: 'qr_code',
          solutionOptions: [{ correct: true, text: 'bibliothek-2026' }],
        }}
      />
    );

    expect(screen.getByText('QR-Code scannen')).toBeInTheDocument();
    expect(screen.queryByText('bibliothek-2026')).not.toBeInTheDocument();
  });
});
