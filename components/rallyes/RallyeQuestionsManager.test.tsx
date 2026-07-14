import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RallyeQuestionsManager from './RallyeQuestionsManager';
import type { Question } from '@/helpers/questions';

const { mockAdd, mockRemove, mockSetVoting, mockRefresh } = vi.hoisted(() => ({
  mockAdd: vi.fn(),
  mockRemove: vi.fn(),
  mockSetVoting: vi.fn(),
  mockRefresh: vi.fn(),
}));

vi.mock('@/actions/assign_questions_to_rallye', () => ({
  addQuestionToRallye: mockAdd,
  removeQuestionFromRallye: mockRemove,
  setQuestionVoting: mockSetVoting,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const makeQuestion = (overrides: Partial<Question>): Question => ({
  id: 1,
  content: 'Wo ist die Mensa?',
  type: 'knowledge',
  point_value: 3,
  category: 'Campus',
  solutionOptions: [],
  ...overrides,
});

const uploadQuestion = makeQuestion({
  id: 2,
  content: 'Macht ein Gruppenfoto',
  type: 'upload',
  point_value: 8,
});

describe('RallyeQuestionsManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows assigned questions with points total', () => {
    render(
      <RallyeQuestionsManager
        rallyeId={5}
        initialAssigned={[
          { question: makeQuestion({}), isVoting: false },
          { question: uploadQuestion, isVoting: true },
        ]}
        initialAvailable={[]}
        categories={[]}
      />
    );
    expect(screen.getByText('2 Fragen · 11 Punkte gesamt')).toBeInTheDocument();
    expect(screen.getByText('Wo ist die Mensa?')).toBeInTheDocument();
    expect(screen.getByText('Macht ein Gruppenfoto')).toBeInTheDocument();
    expect(screen.getByText('Antwort eingeben')).toBeInTheDocument();
    expect(screen.getByText('Foto hochladen')).toBeInTheDocument();
    expect(screen.queryByText('Wissensfrage')).not.toBeInTheDocument();
  });

  it('shows the voting checkbox only for upload questions', () => {
    render(
      <RallyeQuestionsManager
        rallyeId={5}
        initialAssigned={[
          { question: makeQuestion({}), isVoting: false },
          { question: uploadQuestion, isVoting: false },
        ]}
        initialAvailable={[]}
        categories={[]}
      />
    );
    expect(
      screen.getAllByRole('checkbox', { name: 'Abstimmung' })
    ).toHaveLength(1);
  });

  it('removes an assigned question via the action', async () => {
    mockRemove.mockResolvedValue({ success: true, data: { message: 'ok' } });
    render(
      <RallyeQuestionsManager
        rallyeId={5}
        initialAssigned={[{ question: makeQuestion({}), isVoting: false }]}
        initialAvailable={[]}
        categories={[]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Frage entfernen' }));
    await waitFor(() => expect(mockRemove).toHaveBeenCalledWith(5, 1));
    expect(screen.getByText('Keine Fragen zugeordnet')).toBeInTheDocument();
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('adds an available question from the dialog', async () => {
    mockAdd.mockResolvedValue({ success: true, data: { message: 'ok' } });
    render(
      <RallyeQuestionsManager
        rallyeId={5}
        initialAssigned={[]}
        initialAvailable={[makeQuestion({ id: 9, content: 'Neue Frage' })]}
        categories={['Campus']}
      />
    );
    fireEvent.click(
      screen.getByRole('button', { name: '+ Fragen hinzufügen' })
    );
    expect(screen.getByText('Neue Frage')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Frage hinzufügen' }));
    await waitFor(() => expect(mockAdd).toHaveBeenCalledWith(5, 9));
    await waitFor(() =>
      expect(screen.getByText('1 Frage · 3 Punkte gesamt')).toBeInTheDocument()
    );
  });

  it('links to creating and assigning a new question', () => {
    render(
      <RallyeQuestionsManager
        rallyeId={5}
        initialAssigned={[]}
        initialAvailable={[]}
        categories={[]}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: '+ Fragen hinzufügen' })
    );

    expect(
      screen.getByRole('link', { name: 'Neue Frage erstellen' })
    ).toHaveAttribute('href', '/questions/new?rallyeId=5');
  });

  it('toggles voting via the action', async () => {
    mockSetVoting.mockResolvedValue({
      success: true,
      data: { message: 'ok' },
    });
    render(
      <RallyeQuestionsManager
        rallyeId={5}
        initialAssigned={[{ question: uploadQuestion, isVoting: false }]}
        initialAvailable={[]}
        categories={[]}
      />
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Abstimmung' }));
    await waitFor(() => expect(mockSetVoting).toHaveBeenCalledWith(5, 2, true));
  });

  it('shows the action error and keeps state on failure', async () => {
    mockRemove.mockResolvedValue({ success: false, error: 'Kaputt' });
    render(
      <RallyeQuestionsManager
        rallyeId={5}
        initialAssigned={[{ question: makeQuestion({}), isVoting: false }]}
        initialAvailable={[]}
        categories={[]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Frage entfernen' }));
    await waitFor(() => expect(screen.getByText('Kaputt')).toBeInTheDocument());
    expect(screen.getByText('Wo ist die Mensa?')).toBeInTheDocument();
  });
});
