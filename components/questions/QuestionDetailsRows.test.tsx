import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import QuestionDetailsRows from './QuestionDetailsRows';

describe('QuestionDetailsRows', () => {
  it('shows geocaching coordinates, radius and input mode', () => {
    render(
      <QuestionDetailsRows
        isExpanded
        question={{
          id: 1,
          content: 'Finde den Eingang',
          type: 'geocaching',
          geocaching: {
            target_latitude: 47.1234564,
            target_longitude: 7.7654326,
            proximity_radius: 25,
            input_type: 'qr',
          },
        }}
      />
    );

    expect(screen.getByText('Zielort:')).toBeInTheDocument();
    expect(screen.getByText(/47\.123456, 7\.765433/)).toBeInTheDocument();
    expect(screen.getByText(/25 m/)).toBeInTheDocument();
    expect(screen.getByText(/QR-Code scannen/)).toBeInTheDocument();
  });

  it('renders geocaching metadata without other detail rows', () => {
    const { container } = render(
      <QuestionDetailsRows
        isExpanded
        question={{
          id: 2,
          content: 'Legacy-Ziel',
          type: 'geocaching',
          solutionOptions: [],
          geocaching: {
            target_latitude: 0,
            target_longitude: 0,
            proximity_radius: 10,
            input_type: 'text',
          },
        }}
      />
    );

    expect(container).not.toBeEmptyDOMElement();
    expect(screen.getByText(/Texteingabe/)).toBeInTheDocument();
  });
});
