import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QuestionPage from './QuestionPage';

const { push, mockSearchParams } = vi.hoisted(() => ({
  push: vi.fn(),
  mockSearchParams: { get: vi.fn() },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => mockSearchParams,
}));

describe('QuestionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns to the provided returnTo param on cancel', () => {
    mockSearchParams.get.mockReturnValue('/rallyes/1/questions');

    render(
      <QuestionPage
        id="new"
        initialData={null}
        categories={[]}
        rallyes={[]}
        initialRallyeIds={[]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));

    expect(push).toHaveBeenCalledWith('/rallyes/1/questions');
  });
});
