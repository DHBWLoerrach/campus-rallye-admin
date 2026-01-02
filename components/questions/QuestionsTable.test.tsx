import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import QuestionsTable from './QuestionsTable';

describe('QuestionsTable', () => {
  it('renders a compact questions table with meta indicators', () => {
    const { container } = render(
      <QuestionsTable
        questions={[
          {
            id: 1,
            content: 'Testfrage',
            type: 'knowledge',
            points: 2,
            hint: 'Hinweistext',
            bucket_path: 'questions/1.png',
            answers: [
              { id: 1, correct: true, text: 'Antwort A' },
              { id: 2, correct: false, text: 'Antwort B' },
            ],
          },
        ]}
        rallyeMap={{ 1: ['Rallye A', 'Rallye B'] }}
      />
    );

    expect(
      screen.getByRole('columnheader', { name: 'Frage' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Typ' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Aktionen' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('columnheader', { name: 'Punkte' })
    ).not.toBeInTheDocument();
    expect(screen.getByText('Testfrage')).toBeInTheDocument();
    expect(screen.getByText('Wissensfrage')).toBeInTheDocument();
    expect(screen.getByText('2p')).toBeInTheDocument();
    expect(screen.getByTitle('Bild vorhanden')).toBeInTheDocument();
    expect(screen.getByTitle('Hinweis vorhanden')).toBeInTheDocument();
    expect(screen.getByText('2 Rallyes')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bearbeiten' })).toHaveAttribute(
      'href',
      '/questions/1'
    );

    expect(screen.queryByText('Hinweistext')).not.toBeInTheDocument();
    const toggle = container.querySelector('tbody tr td svg');
    expect(toggle).not.toBeNull();
    fireEvent.click(toggle as SVGElement);
    expect(screen.getByText('Hinweis:')).toBeInTheDocument();
    expect(screen.getByText('Hinweistext')).toBeInTheDocument();
    expect(screen.getByText('Rallyes:')).toBeInTheDocument();
    expect(screen.getByText('Rallye A, Rallye B')).toBeInTheDocument();
    expect(screen.getByText('Antworten:')).toBeInTheDocument();
    expect(screen.getByText('Antwort A')).toBeInTheDocument();
    expect(screen.getByText('Antwort B')).toBeInTheDocument();
  });

  it('uses singular label when there is only one answer', () => {
    const { container } = render(
      <QuestionsTable
        questions={[
          {
            id: 1,
            content: 'Testfrage',
            type: 'knowledge',
            answers: [{ id: 1, correct: true, text: 'Einzelantwort' }],
          },
        ]}
      />
    );

    const toggle = container.querySelector('tbody tr td svg');
    expect(toggle).not.toBeNull();
    fireEvent.click(toggle as SVGElement);
    expect(screen.getByText('Antwort:')).toBeInTheDocument();
    expect(screen.getByText('Einzelantwort')).toBeInTheDocument();
  });
});
