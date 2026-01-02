import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import QuestionForm from './QuestionForm';
import type { Question } from '@/helpers/questions';

describe('QuestionForm', () => {
  it('normalizes null values to empty strings for inputs', () => {
    const initialData = {
      hint: null,
      category: null,
      answers: [{ id: 1, correct: true, text: null }],
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
        rallyes={[]}
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

  it('includes selected rallyes in the submit payload', () => {
    const handleSubmit = vi.fn();

    render(
      <QuestionForm
        initialData={{
          content: 'Was ist die Antwort?',
          type: 'knowledge',
          answers: [{ id: 1, correct: true, text: '42' }],
        }}
        onSubmit={handleSubmit}
        onCancel={vi.fn()}
        categories={[]}
        rallyes={[
          { id: 1, name: 'Rallye A' },
          { id: 2, name: 'Rallye B' },
        ]}
      />
    );

    fireEvent.click(screen.getByLabelText('Rallye A'));
    fireEvent.click(screen.getByLabelText('Rallye B'));
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit.mock.calls[0][0].rallyeIds).toEqual(
      expect.arrayContaining([1, 2])
    );
  });

  it('keeps a correct answer when removing the last answer', () => {
    render(
      <QuestionForm
        initialData={{
          content: 'Beispielfrage',
          type: 'multiple_choice',
          answers: [{ id: 1, correct: true, text: 'Antwort A' }],
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={[]}
        rallyes={[]}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Antwort entfernen' })
    );

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
          answers: [
            { id: 1, correct: false, text: 'Antwort A' },
            { id: 2, correct: true, text: 'Antwort B' },
            { id: 3, correct: false, text: 'Antwort C' },
          ],
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={[]}
        rallyes={[]}
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
          answers: [{ id: 1, correct: true, text: 'Antwort A' }],
        }}
        onSubmit={handleSubmit}
        onCancel={vi.fn()}
        categories={[]}
        rallyes={[]}
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
          answers: [
            { id: 1, correct: true, text: 'Antwort A' },
            { id: 2, correct: false, text: 'Antwort A' },
          ],
        }}
        onSubmit={handleSubmit}
        onCancel={vi.fn()}
        categories={[]}
        rallyes={[]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(handleSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText('Antworten müssen unterschiedlich sein')
    ).toBeInTheDocument();
  });
});
