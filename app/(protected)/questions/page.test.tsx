import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getQuestions, getCategories } from '@/actions/question';
import { getRallyeOptions } from '@/actions/rallye';
import { getQuestionRallyeMap } from '@/actions/assign_questions_to_rallye';
import Questions from './page';

vi.mock('@/actions/question', () => ({
  getQuestions: vi.fn(),
  getCategories: vi.fn(),
}));
vi.mock('@/actions/rallye', () => ({ getRallyeOptions: vi.fn() }));
vi.mock('@/actions/assign_questions_to_rallye', () => ({
  getQuestionRallyeMap: vi.fn(),
}));

describe('Questions page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getQuestions).mockResolvedValue({
      success: true,
      data: [
        {
          id: 1,
          content: 'Wo ist die Mensa?',
          type: 'knowledge',
          solutionOptions: [],
        },
      ],
    });
    vi.mocked(getCategories).mockResolvedValue({ success: true, data: [] });
    vi.mocked(getRallyeOptions).mockResolvedValue({ success: true, data: [] });
    vi.mocked(getQuestionRallyeMap).mockResolvedValue({
      success: true,
      data: {},
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('preserves an initial question failure instead of showing an empty catalog', async () => {
    vi.mocked(getQuestions).mockResolvedValue({
      success: false,
      error: 'Database failure',
    });
    render(await Questions());
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Fragen konnten nicht geladen werden.'
    );
    expect(
      screen.getByRole('button', { name: 'Erneut versuchen' })
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Noch keine Fragen vorhanden.')
    ).not.toBeInTheDocument();
  });

  it('preserves an initial usage failure instead of marking questions as unused', async () => {
    vi.mocked(getQuestionRallyeMap).mockResolvedValue({
      success: false,
      error: 'Database failure',
    });
    render(await Questions());
    expect(screen.getByText('Wo ist die Mensa?')).toBeInTheDocument();
    expect(
      screen.getByText('Verwendung momentan nicht verfügbar')
    ).toBeInTheDocument();
    expect(screen.queryByText('Noch nicht verwendet')).not.toBeInTheDocument();
  });

  it('marks questions as unused after a successful empty usage response', async () => {
    render(await Questions());
    expect(screen.getByText('Noch nicht verwendet')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
