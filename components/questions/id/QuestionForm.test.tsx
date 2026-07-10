import { fireEvent, render, screen } from '@testing-library/react';
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

  it('shows only question and type until a type is chosen', () => {
    render(
      <QuestionForm onSubmit={vi.fn()} onCancel={vi.fn()} categories={[]} />
    );
    expect(screen.getByLabelText('Frage*')).toBeInTheDocument();
    expect(screen.queryByLabelText('Punkte')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Hinweis')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Kategorie')).not.toBeInTheDocument();
    expect(
      screen.getByText(
        'Zuerst einen Fragetyp wählen — danach erscheinen die passenden Felder.'
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

    const radios = screen.getAllByRole('radio');
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

    const radios = screen.getAllByRole('radio');
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
