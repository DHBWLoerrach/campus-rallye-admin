import { fireEvent, render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import QuestionForm from './QuestionForm';
import type {
  SolutionOption,
  Question,
  QuestionFormData,
} from '@/helpers/questions';

describe('QuestionForm', () => {
  it('normalizes null values to empty strings for inputs', () => {
    const initialData = {
      hint: null,
      category: null,
      type: 'knowledge',
      solutionOptions: [{ id: 1, correct: true, text: null }],
    } as unknown as Partial<Question>;

    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    render(
      <QuestionForm
        initialData={initialData}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={['Test Category']}
      />
    );

    expect(screen.getByLabelText('Hinweis')).toHaveValue('');
    expect(screen.getByPlaceholderText(/Antwort/i)).toHaveValue('');

    const hasNullValueWarning = consoleErrorSpy.mock.calls.some((call) =>
      call.some(
        (arg) =>
          typeof arg === 'string' &&
          arg.includes('value prop on `input` should not be null')
      )
    );
    expect(hasNullValueWarning).toBe(false);

    consoleErrorSpy.mockRestore();
  });

  it('submits without a rallyeIds field so assignments stay untouched', () => {
    const handleSubmit = vi.fn();

    render(
      <QuestionForm
        initialData={{
          content: 'Was ist die Antwort?',
          type: 'knowledge',
          solutionOptions: [{ id: 1, correct: true, text: '42' }],
        }}
        onSubmit={handleSubmit}
        onCancel={vi.fn()}
        categories={[]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit.mock.calls[0][0].rallyeIds).toBeUndefined();
    expect(screen.queryByText('Rallyes zuordnen')).not.toBeInTheDocument();
  });

  it('offers task-oriented question type cards', () => {
    render(
      <QuestionForm onSubmit={vi.fn()} onCancel={vi.fn()} categories={[]} />
    );

    expect(
      screen.getByRole('radiogroup', { name: /Was sollen die Teams tun/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: /Antwort eingeben/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: /Antwort auswählen/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: /Bild ansehen und antworten/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: /QR-Code finden/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: /Foto hochladen/ })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Frage*')).toBeInTheDocument();
    expect(screen.queryByLabelText('Punkte')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Hinweis')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Kategorie')).not.toBeInTheDocument();
    expect(screen.queryByText('Fragetyp wählen')).not.toBeInTheDocument();
  });

  it('shows the matching fields after selecting a task', () => {
    render(
      <QuestionForm onSubmit={vi.fn()} onCancel={vi.fn()} categories={[]} />
    );

    const knowledgeType = screen.getByRole('radio', {
      name: /Antwort eingeben/,
    });
    fireEvent.click(knowledgeType);

    expect(knowledgeType).toBeChecked();
    expect(screen.getByLabelText('Punkte')).toBeInTheDocument();
    expect(screen.getByText('Antwort*')).toBeInTheDocument();
  });

  it('structures the editor and keeps further details collapsed', () => {
    render(
      <QuestionForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={['Campus']}
        initialData={{
          content: 'Wo ist die Mensa?',
          type: 'knowledge',
          point_value: 5,
          hint: 'Folgt den Schildern.',
          solutionOptions: [{ id: 1, correct: true, text: 'Gebäude A' }],
        }}
      />
    );

    expect(
      screen.getByRole('heading', { name: 'Aufgabenart' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Aufgabe formulieren' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Lösung festlegen' })
    ).toBeInTheDocument();

    const summary = screen.getByText('Weitere Angaben');
    const details = summary.closest('details');
    expect(details).not.toHaveAttribute('open');
    expect(screen.getByText('2 Angaben ausgefüllt')).toBeInTheDocument();

    fireEvent.click(summary.closest('summary')!);
    expect(details).toHaveAttribute('open');
  });

  it('keeps the image field outside the optional details', () => {
    render(
      <QuestionForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={[]}
        initialData={{
          content: 'Welches Gebäude ist zu sehen?',
          type: 'picture',
          solutionOptions: [{ id: 1, correct: true, text: 'Gebäude A' }],
        }}
      />
    );

    const details = screen.getByText('Weitere Angaben').closest('details');
    const imageLabel = screen.getByText('Bild');
    expect(details).not.toContainElement(imageLabel);
  });

  it('opens further details when an optional field is invalid', () => {
    render(
      <QuestionForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={[]}
        initialData={{
          content: 'Wo ist die Mensa?',
          type: 'knowledge',
          point_value: -1,
          solutionOptions: [{ id: 1, correct: true, text: 'Gebäude A' }],
        }}
      />
    );

    const details = screen.getByText('Weitere Angaben').closest('details');
    expect(details).not.toHaveAttribute('open');

    fireEvent.submit(
      screen.getByRole('button', { name: 'Speichern' }).closest('form')!
    );

    expect(details).toHaveAttribute('open');
    expect(
      screen.getByText('Punkte müssen größer oder gleich 0 sein')
    ).toBeInTheDocument();
  });

  it('allows clearing points and submits them as unset', () => {
    const handleSubmit = vi.fn();

    render(
      <QuestionForm
        onSubmit={handleSubmit}
        onCancel={vi.fn()}
        categories={[]}
        initialData={{
          content: 'Wo ist die Mensa?',
          type: 'knowledge',
          point_value: 5,
          solutionOptions: [{ id: 1, correct: true, text: 'Gebäude A' }],
        }}
      />
    );

    fireEvent.click(screen.getByText('Weitere Angaben').closest('summary')!);
    const pointsInput = screen.getByLabelText('Punkte');
    fireEvent.change(pointsInput, { target: { value: '' } });

    expect(pointsInput).toHaveDisplayValue('');

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit.mock.calls[0][0].point_value).toBeUndefined();
  });

  it('counts explicitly set zero points as a filled detail', () => {
    render(
      <QuestionForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={[]}
        initialData={{
          content: 'Wo ist die Mensa?',
          type: 'knowledge',
          point_value: 0,
          solutionOptions: [{ id: 1, correct: true, text: 'Gebäude A' }],
        }}
      />
    );

    expect(screen.getByText('1 Angabe ausgefüllt')).toBeInTheDocument();
  });

  it('keeps the task type locked for an existing question', () => {
    render(
      <QuestionForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={[]}
        initialData={{
          id: 1,
          content: 'X',
          type: 'knowledge',
          solutionOptions: [{ id: 1, correct: true, text: 'Antwort' }],
        }}
      />
    );

    expect(
      screen.getByRole('radio', { name: /Antwort eingeben/ })
    ).toBeDisabled();
    expect(
      screen.getByText(
        'Die Aufgabenart kann nach dem Erstellen nicht geändert werden.'
      )
    ).toBeInTheDocument();
  });

  it('shows the relevant fields once a type is set', () => {
    render(
      <QuestionForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={[]}
        initialData={{
          id: 1,
          content: 'X',
          type: 'knowledge',
          solutionOptions: [],
        }}
      />
    );
    expect(screen.getByLabelText('Punkte')).toBeInTheDocument();
    expect(screen.getByLabelText('Hinweis')).toBeInTheDocument();
    expect(screen.queryByText('Rallyes zuordnen')).not.toBeInTheDocument();
  });

  it('keeps a correct answer when removing the last answer', () => {
    render(
      <QuestionForm
        initialData={{
          content: 'Beispielfrage',
          type: 'multiple_choice',
          solutionOptions: [{ id: 1, correct: true, text: 'Antwort A' }],
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={[]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Antwort entfernen' }));

    const radios = within(
      screen.getByRole('radiogroup', { name: 'Richtige Antwort' })
    ).getAllByRole('radio');
    expect(radios).toHaveLength(1);
    expect(radios[0]).toHaveAttribute('data-state', 'checked');
  });

  it('reassigns the correct answer when removing the selected one', () => {
    render(
      <QuestionForm
        initialData={{
          content: 'Mehrfachauswahl',
          type: 'multiple_choice',
          solutionOptions: [
            { id: 1, correct: false, text: 'Antwort A' },
            { id: 2, correct: true, text: 'Antwort B' },
            { id: 3, correct: false, text: 'Antwort C' },
          ],
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={[]}
      />
    );

    const removeButtons = screen.getAllByRole('button', {
      name: 'Antwort entfernen',
    });
    fireEvent.click(removeButtons[1]);

    const radios = within(
      screen.getByRole('radiogroup', { name: 'Richtige Antwort' })
    ).getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(radios[1]).toHaveAttribute('data-state', 'checked');
  });

  it('requires at least two answers for multiple choice', () => {
    const handleSubmit = vi.fn();

    render(
      <QuestionForm
        initialData={{
          content: 'Mehrfachauswahl',
          type: 'multiple_choice',
          solutionOptions: [{ id: 1, correct: true, text: 'Antwort A' }],
        }}
        onSubmit={handleSubmit}
        onCancel={vi.fn()}
        categories={[]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(handleSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText('Mindestens zwei Antworten müssen eingegeben werden')
    ).toBeInTheDocument();
  });

  it('requires unique answers for multiple choice', () => {
    const handleSubmit = vi.fn();

    render(
      <QuestionForm
        initialData={{
          content: 'Mehrfachauswahl',
          type: 'multiple_choice',
          solutionOptions: [
            { id: 1, correct: true, text: 'Antwort A' },
            { id: 2, correct: false, text: 'Antwort A' },
          ],
        }}
        onSubmit={handleSubmit}
        onCancel={vi.fn()}
        categories={[]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(handleSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText('Antworten müssen unterschiedlich sein')
    ).toBeInTheDocument();
  });

  it('strips placeholder answer ids before submit', () => {
    const handleSubmit = vi.fn();

    render(
      <QuestionForm
        initialData={{
          content: 'Mehrfachauswahl',
          type: 'multiple_choice',
          solutionOptions: [{ id: 1, correct: true, text: 'Antwort A' }],
        }}
        onSubmit={handleSubmit}
        onCancel={vi.fn()}
        categories={[]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Antwort hinzufügen' }));
    const answerInputs = screen.getAllByPlaceholderText(/Antwort/i);
    fireEvent.change(answerInputs[1], { target: { value: 'Antwort B' } });
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    const submitted = handleSubmit.mock.calls[0][0] as QuestionFormData;
    const submittedAnswers: SolutionOption[] = submitted.solutionOptions ?? [];
    expect(submittedAnswers).toHaveLength(2);
    expect(submittedAnswers.some((answer) => answer.id === 0)).toBe(false);
    expect(submittedAnswers.some((answer) => answer.id === 1)).toBe(true);
  });

  it('reports dirty state changes', () => {
    const handleDirtyChange = vi.fn();

    render(
      <QuestionForm
        initialData={{
          content: 'Beispielfrage',
          type: 'knowledge',
          solutionOptions: [{ id: 1, correct: true, text: 'Antwort' }],
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        onDirtyChange={handleDirtyChange}
        categories={[]}
      />
    );

    const questionInput = screen.getByLabelText(/Frage/i);
    fireEvent.change(questionInput, { target: { value: 'Neue Frage' } });

    expect(handleDirtyChange).toHaveBeenCalledWith(true);

    fireEvent.change(questionInput, { target: { value: 'Beispielfrage' } });

    expect(handleDirtyChange).toHaveBeenLastCalledWith(false);
  });
});
