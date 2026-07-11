import { fireEvent, render, screen, within } from '@testing-library/react';
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
            point_value: 2,
            hint: 'Hinweistext',
            bucket_path: 'questions/1.png',
            solutionOptions: [
              { id: 1, correct: true, text: 'Antwort A' },
              { id: 2, correct: false, text: 'Antwort B' },
            ],
          },
        ]}
        rallyeMap={{ 1: ['Rallye A', 'Rallye B'] }}
      />
    );

    expect(
      screen.getByRole('columnheader', { name: 'Aufgabe' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Was Teams tun' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Aktionen' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Punkte' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Verwendet in' })
    ).toBeInTheDocument();
    expect(screen.getByText('Testfrage')).toBeInTheDocument();
    expect(screen.getByText('Antwort eingeben')).toBeInTheDocument();
    expect(screen.getByText('Lösung:')).toBeInTheDocument();
    expect(screen.getByText('Antwort A')).toBeInTheDocument();
    expect(screen.getByText('2 Punkte')).toBeInTheDocument();
    expect(screen.getByTitle('Bild vorhanden')).toBeInTheDocument();
    expect(screen.getByTitle('Hinweis vorhanden')).toBeInTheDocument();
    expect(screen.getByText('2 Rallyes')).toHaveAttribute(
      'title',
      'Rallye A, Rallye B'
    );
    expect(
      screen.getByRole('link', { name: 'Aufgabe „Testfrage“ bearbeiten' })
    ).toHaveAttribute('href', '/questions/1');
    expect(
      screen.getByRole('link', {
        name: '„Testfrage“ als neue Aufgabe verwenden',
      })
    ).toHaveAttribute('href', '/questions/new?copyFrom=1');

    expect(screen.queryByText('Hinweistext')).not.toBeInTheDocument();
    const toggle = screen.getByRole('button', {
      name: 'Details zu „Testfrage“ anzeigen',
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).not.toHaveAttribute('aria-controls');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('aria-controls', 'question-1-details');
    expect(document.getElementById('question-1-details')).toBeInTheDocument();
    expect(screen.getByText('Hinweis:')).toBeInTheDocument();
    expect(screen.getByText('Hinweistext')).toBeInTheDocument();
    expect(screen.getByText('Rallyes:')).toBeInTheDocument();
    expect(screen.getByText('Rallye A, Rallye B')).toBeInTheDocument();
    expect(screen.getByText('Antworten:')).toBeInTheDocument();
    expect(screen.getAllByText('Antwort A')).toHaveLength(2);
    expect(screen.getByText('Antwort B')).toBeInTheDocument();
  });

  it('uses singular label when there is only one answer', () => {
    render(
      <QuestionsTable
        questions={[
          {
            id: 1,
            content: 'Testfrage',
            type: 'knowledge',
            solutionOptions: [{ id: 1, correct: true, text: 'Einzelantwort' }],
          },
        ]}
      />
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Details zu „Testfrage“ anzeigen',
      })
    );
    expect(screen.getByText('Antwort:')).toBeInTheDocument();
    expect(screen.getAllByText('Einzelantwort')).toHaveLength(2);
  });

  it('explains missing type, points and rallye usage', () => {
    render(
      <QuestionsTable
        questions={[
          { id: 2, content: 'Ohne alles', type: '', solutionOptions: [] },
        ]}
      />
    );

    const rows = screen.getAllByRole('row');
    const questionRow = within(rows[1]);
    expect(questionRow.getByText('Aufgabenart fehlt')).toBeInTheDocument();
    expect(questionRow.getByText('Keine Punkte')).toBeInTheDocument();
    expect(questionRow.getByText('Noch nicht verwendet')).toBeInTheDocument();
  });

  it('labels the stored value of a QR task as QR code content', () => {
    render(
      <QuestionsTable
        questions={[
          {
            id: 3,
            content: 'Findet den Code am Eingang',
            type: 'qr_code',
            solutionOptions: [{ id: 4, correct: true, text: 'campus-library' }],
          },
        ]}
      />
    );

    expect(screen.getByText('QR-Code-Inhalt:')).toBeInTheDocument();
    expect(screen.getByText('campus-library')).toBeInTheDocument();
    expect(screen.queryByText('Lösung:')).not.toBeInTheDocument();
  });
});
