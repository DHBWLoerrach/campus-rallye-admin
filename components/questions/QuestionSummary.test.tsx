import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import QuestionSummary from './QuestionSummary';

const baseQuestion = {
  id: 1,
  content: 'Finde den Eingang',
  type: 'geocaching' as const,
  solutionOptions: [{ id: 1, correct: true, text: 'campus-entry' }],
};

describe('QuestionSummary', () => {
  it('labels a QR geocaching solution as QR code content', () => {
    render(
      <QuestionSummary
        question={{
          ...baseQuestion,
          geocaching: {
            target_latitude: 47.123456,
            target_longitude: 7.123456,
            proximity_radius: 10,
            input_type: 'qr',
          },
        }}
      />
    );

    expect(screen.getByText('QR-Code-Inhalt:')).toBeInTheDocument();
    expect(screen.queryByText('Lösung:')).not.toBeInTheDocument();
  });

  it('labels a text geocaching solution as solution', () => {
    render(
      <QuestionSummary
        question={{
          ...baseQuestion,
          geocaching: {
            target_latitude: 47.123456,
            target_longitude: 7.123456,
            proximity_radius: 10,
            input_type: 'text',
          },
        }}
      />
    );

    expect(screen.getByText('Lösung:')).toBeInTheDocument();
  });
});
