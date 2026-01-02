import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import QuestionsTable from './QuestionsTable';

describe('QuestionsTable', () => {
  it('renders a compact questions table with meta indicators', () => {
    render(
      <QuestionsTable
        questions={[
          {
            id: 1,
            content: 'Testfrage',
            type: 'knowledge',
            points: 2,
            hint: 'Hinweistext',
            bucket_path: 'questions/1.png',
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
  });
});
