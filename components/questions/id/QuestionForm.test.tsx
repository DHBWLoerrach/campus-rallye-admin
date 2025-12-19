import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import QuestionForm from './QuestionForm';
import type { Question } from '@/helpers/questions';
import { getCategories } from '@/actions/question';

vi.mock('@/actions/question', () => ({
  getCategories: vi.fn().mockResolvedValue([]),
}));

describe('QuestionForm', () => {
  it('normalizes null values to empty strings for inputs', async () => {
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
      />
    );

    await waitFor(() => expect(getCategories).toHaveBeenCalled());

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
});
