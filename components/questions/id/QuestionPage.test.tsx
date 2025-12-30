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
      screen.getByRole('link', { name: 'Zurück zur Rallye' })
    ).toHaveAttribute('href', '/rallyes/1/questions');
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

    expect(screen.getByText('Zugeordnet zu:')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Rallye A' })
    ).toHaveAttribute('href', '/rallyes/1/questions');
    expect(
      screen.getByRole('link', { name: 'Rallye B' })
    ).toHaveAttribute('href', '/rallyes/2/questions');
    expect(
      screen.getByText('Wirkt in allen zugeordneten Rallyes.')
    ).toBeInTheDocument();
  });

  it('preselects a rallye for new questions when rallyeId is provided', () => {
    mockSearchParams.get.mockImplementation((key) => {
      if (key === 'rallyeId') return '2';
      return '';
    });

    render(
      <QuestionPage
        id="new"
        initialData={null}
        categories={[]}
        rallyes={[
          { id: 1, name: 'Rallye A' },
          { id: 2, name: 'Rallye B' },
        ]}
        initialRallyeIds={[]}
      />
    );

    const checkbox = screen.getByRole('checkbox', { name: 'Rallye B' });
    expect(checkbox).toHaveAttribute('data-state', 'checked');
  });
});
