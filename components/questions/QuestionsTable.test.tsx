import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import QuestionsTable from './QuestionsTable';

describe('QuestionsTable', () => {
  it('shows rallye count with a tooltip of names', () => {
    render(
      <QuestionsTable
        questions={[
          {
            id: 1,
            content: 'Testfrage',
            type: 'knowledge',
            points: 2,
            category: 'Allgemein',
            hint: 'Hinweis',
          },
        ]}
        rallyeMap={{ 1: ['Rallye A', 'Rallye B'] }}
      />
    );

    const countCell = screen.getByTitle('Rallye A, Rallye B');
    expect(countCell).toHaveTextContent('2');
  });
});
