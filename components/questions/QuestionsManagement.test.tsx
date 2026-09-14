import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getQuestions } from '@/actions/question';
import { getQuestionRallyeMap } from '@/actions/assign_questions_to_rallye';
import type { Question } from '@/helpers/questions';
import QuestionsManagement from './QuestionsManagement';

vi.mock('@/actions/question', () => ({ getQuestions: vi.fn() }));
vi.mock('@/actions/assign_questions_to_rallye', () => ({
  getQuestionRallyeMap: vi.fn(),
}));

const question: Question = {
  id: 1,
  content: 'Wo ist die Mensa?',
  type: 'knowledge',
  solutionOptions: [],
};

const props = {
  initialQuestions: [question],
  initialRallyeMap: { 1: ['Campus-Rallye'] },
  categories: ['Campus'],
  rallyes: [{ id: 1, name: 'Campus-Rallye' }],
};

const searchFor = (search: string) =>
  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value: search },
  });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('QuestionsManagement', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getQuestions).mockResolvedValue({
      success: true,
      data: [question],
    });
    vi.mocked(getQuestionRallyeMap).mockResolvedValue({
      success: true,
      data: { 1: ['Campus-Rallye'] },
    });
  });

  it('shows loading until questions and their usage have loaded', async () => {
    const pendingQuestions =
      deferred<Awaited<ReturnType<typeof getQuestions>>>();
    const pendingUsage =
      deferred<Awaited<ReturnType<typeof getQuestionRallyeMap>>>();
    vi.mocked(getQuestions).mockReturnValueOnce(pendingQuestions.promise);
    vi.mocked(getQuestionRallyeMap).mockReturnValueOnce(pendingUsage.promise);
    render(<QuestionsManagement {...props} />);

    searchFor('Mensa');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Fragen werden geladen'
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    await act(async () => {
      pendingQuestions.resolve({ success: true, data: [question] });
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Fragen werden geladen'
    );
    expect(screen.queryByText('Noch nicht verwendet')).not.toBeInTheDocument();

    await act(async () => {
      pendingUsage.resolve({ success: true, data: { 1: ['Campus-Rallye'] } });
    });
    expect(screen.getByText('Wo ist die Mensa?')).toBeInTheDocument();
    expect(screen.getByText('1 Rallye')).toBeInTheDocument();
  });

  it.each(['result', 'exception'])(
    'offers retry for a question %s failure with the same filters',
    async (failure) => {
      if (failure === 'result') {
        vi.mocked(getQuestions).mockResolvedValueOnce({
          success: false,
          error: 'Database failure',
        });
      } else {
        vi.mocked(getQuestions).mockRejectedValueOnce(
          new Error('Network failure')
        );
      }
      render(<QuestionsManagement {...props} />);
      searchFor('Mensa');

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Fragen konnten nicht geladen werden.'
      );
      expect(screen.queryByText(/Keine Fragen/)).not.toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }));

      expect(await screen.findByText('Wo ist die Mensa?')).toBeInTheDocument();
      expect(getQuestions).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'Mensa' })
      );
      expect(screen.getByRole('searchbox')).toHaveValue('Mensa');
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    }
  );

  it.each(['result', 'exception'])(
    'keeps questions visible with unknown usage after a usage %s failure',
    async (failure) => {
      if (failure === 'result') {
        vi.mocked(getQuestionRallyeMap).mockResolvedValueOnce({
          success: false,
          error: 'Database failure',
        });
      } else {
        vi.mocked(getQuestionRallyeMap).mockRejectedValueOnce(
          new Error('Network failure')
        );
      }
      render(<QuestionsManagement {...props} />);
      searchFor('Mensa');

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Rallye-Verwendungen konnten nicht geladen werden.'
      );
      expect(screen.getByText('Wo ist die Mensa?')).toBeInTheDocument();
      expect(
        screen.getByText('Verwendung momentan nicht verfügbar')
      ).toBeInTheDocument();
      expect(
        screen.queryByText('Noch nicht verwendet')
      ).not.toBeInTheDocument();
      expect(screen.queryByText('1 Rallye')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }));
      expect(await screen.findByText('1 Rallye')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    }
  );

  it('resets active filters and visible controls from an empty search result', async () => {
    vi.mocked(getQuestions).mockResolvedValueOnce({ success: true, data: [] });
    render(<QuestionsManagement {...props} />);
    searchFor('Unbekannt');

    expect(
      await screen.findByText('Keine Fragen für diese Filter gefunden.')
    ).toBeInTheDocument();
    expect(getQuestionRallyeMap).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Filter zurücksetzen' })
    );

    expect(await screen.findByText('Wo ist die Mensa?')).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(
      screen.queryByRole('region', { name: 'Aktive Filter' })
    ).not.toBeInTheDocument();
    expect(getQuestions).toHaveBeenLastCalledWith({});
  });

  it('distinguishes an empty catalog from an empty search result', () => {
    render(
      <QuestionsManagement
        {...props}
        initialQuestions={[]}
        initialRallyeMap={{}}
      />
    );
    expect(
      screen.getByText('Noch keine Fragen vorhanden.')
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Filter zurücksetzen' })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Erstellen' })).toHaveAttribute(
      'href',
      '/questions/new'
    );
  });

  it('offers retry when the initial question request failed', async () => {
    render(<QuestionsManagement {...props} initialQuestions={null} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Fragen konnten nicht geladen werden.'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Erneut versuchen' }));
    expect(await screen.findByText('Wo ist die Mensa?')).toBeInTheDocument();
  });

  it('marks initially unavailable usage as unknown', () => {
    render(<QuestionsManagement {...props} initialRallyeMap={null} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Rallye-Verwendungen konnten nicht geladen werden.'
    );
    expect(
      screen.getByText('Verwendung momentan nicht verfügbar')
    ).toBeInTheDocument();
    expect(screen.queryByText('Noch nicht verwendet')).not.toBeInTheDocument();
  });

  it('ignores a stale question failure after a newer search succeeds', async () => {
    const stale = deferred<Awaited<ReturnType<typeof getQuestions>>>();
    vi.mocked(getQuestions).mockReturnValueOnce(stale.promise);
    render(<QuestionsManagement {...props} />);
    searchFor('Bibliothek');
    searchFor('Mensa');
    expect(await screen.findByText('Wo ist die Mensa?')).toBeInTheDocument();

    await act(async () => {
      stale.resolve({ success: false, error: 'Late failure' });
    });
    expect(screen.getByText('Wo ist die Mensa?')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('ignores stale usage data after a newer search succeeds', async () => {
    const stale = deferred<Awaited<ReturnType<typeof getQuestionRallyeMap>>>();
    vi.mocked(getQuestionRallyeMap).mockReturnValueOnce(stale.promise);
    render(<QuestionsManagement {...props} />);
    await act(async () => searchFor('Bibliothek'));
    searchFor('Mensa');
    expect(await screen.findByText('1 Rallye')).toBeInTheDocument();

    await act(async () => {
      stale.resolve({ success: true, data: {} });
    });
    expect(screen.getByText('1 Rallye')).toBeInTheDocument();
    expect(screen.queryByText('Noch nicht verwendet')).not.toBeInTheDocument();
  });
});
