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
});
