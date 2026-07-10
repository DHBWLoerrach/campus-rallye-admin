import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QuestionPage from './QuestionPage';

const { push, mockSearchParams } = vi.hoisted(() => ({
  push: vi.fn(),
  mockSearchParams: { get: vi.fn(), toString: vi.fn(() => '') },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/questions/new',
}));

describe('QuestionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns to the provided returnTo param on cancel', () => {
    mockSearchParams.get.mockImplementation((key) => {
      if (key === 'returnTo') return '/rallyes/1/questions';
      return '';
    });

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

  it('shows a rallye return link when returnTo is set', () => {
    mockSearchParams.get.mockImplementation((key) => {
      if (key === 'returnTo') return '/rallyes/1/questions';
      return '';
    });

    render(
      <QuestionPage
        id="new"
        initialData={null}
        categories={[]}
        rallyes={[]}
        initialRallyeIds={[]}
      />
    );

    expect(
      screen.getByRole('button', { name: '← Zurück zu Rallye' })
    ).toBeInTheDocument();
  });

  it('shows assigned rallyes with a global impact hint', () => {
    mockSearchParams.get.mockImplementation(() => '');

    render(
      <QuestionPage
        id="1"
        initialData={null}
        categories={[]}
        rallyes={[
          { id: 1, name: 'Rallye A' },
          { id: 2, name: 'Rallye B' },
        ]}
        initialRallyeIds={[1, 2]}
      />
    );

    expect(screen.getByText('Verwendet in 2 Rallyes:')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Rallye A' })).toHaveAttribute(
      'href',
      '/rallyes/1'
    );
    expect(screen.getByRole('link', { name: 'Rallye B' })).toHaveAttribute(
      'href',
      '/rallyes/2'
    );
    expect(
      screen.getByText('Änderungen wirken in allen zugeordneten Rallyes.')
    ).toBeInTheDocument();
  });

  it('shows a hint when the question is used in no rallye', () => {
    mockSearchParams.get.mockImplementation(() => '');

    render(
      <QuestionPage
        id="1"
        initialData={null}
        categories={[]}
        rallyes={[]}
        initialRallyeIds={[]}
      />
    );

    expect(screen.getByText(/In keiner Rallye verwendet/)).toBeInTheDocument();
  });

  it('prompts before navigating via link when form is dirty', () => {
    mockSearchParams.get.mockImplementation(() => '');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <QuestionPage
        id="1"
        initialData={{
          id: 1,
          content: 'Beispielfrage',
          type: 'knowledge',
          solutionOptions: [{ id: 1, correct: true, text: 'Antwort' }],
        }}
        categories={[]}
        rallyes={[{ id: 1, name: 'Rallye A' }]}
        initialRallyeIds={[1]}
      />
    );

    fireEvent.change(screen.getByLabelText(/Frage/i), {
      target: { value: 'Neue Frage' },
    });
    fireEvent.click(screen.getByRole('link', { name: 'Rallye A' }));

    expect(confirmSpy).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('allows navigation via link when user confirms leaving dirty form', () => {
    mockSearchParams.get.mockImplementation(() => '');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <QuestionPage
        id="1"
        initialData={{
          id: 1,
          content: 'Beispielfrage',
          type: 'knowledge',
          solutionOptions: [{ id: 1, correct: true, text: 'Antwort' }],
        }}
        categories={[]}
        rallyes={[{ id: 1, name: 'Rallye A' }]}
        initialRallyeIds={[1]}
      />
    );

    fireEvent.change(screen.getByLabelText(/Frage/i), {
      target: { value: 'Neue Frage' },
    });
    fireEvent.click(screen.getByRole('link', { name: 'Rallye A' }));

    expect(confirmSpy).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('prompts before cancel when form is dirty', () => {
    mockSearchParams.get.mockImplementation((key) => {
      if (key === 'returnTo') return '/rallyes/1/questions';
      return '';
    });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <QuestionPage
        id="1"
        initialData={{
          id: 1,
          content: 'Beispielfrage',
          type: 'knowledge',
          solutionOptions: [{ id: 1, correct: true, text: 'Antwort' }],
        }}
        categories={[]}
        rallyes={[]}
        initialRallyeIds={[]}
      />
    );

    fireEvent.change(screen.getByLabelText(/Frage/i), {
      target: { value: 'Geänderte Frage' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
