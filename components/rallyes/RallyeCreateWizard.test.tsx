import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Question } from '@/helpers/questions';
import RallyeCreateWizard from './RallyeCreateWizard';

const { mockCreate, mockPush } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockPush: vi.fn(),
}));

vi.mock('@/actions/rallye', () => ({
  createRallyeWithQuestions: mockCreate,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const departmentOptions = [
  { id: 7, name: 'HoKo/Marketing' },
  { id: 8, name: 'SZI' },
];

const questions: Question[] = [
  {
    id: 1,
    content: 'Wo ist die Mensa?',
    type: 'knowledge',
    point_value: 3,
    category: 'Campus',
    solutionOptions: [],
  },
];

describe('RallyeCreateWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('walks through the three steps and creates the rallye', async () => {
    mockCreate.mockResolvedValue({
      success: true,
      data: { rallyeId: 42, message: 'ok' },
    });
    render(
      <RallyeCreateWizard
        departmentOptions={departmentOptions}
        defaultDepartmentId={7}
        questions={questions}
        categories={['Campus']}
      />
    );

    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Studieninfotag 2027' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));

    expect(screen.getByText(/Antwort eingeben/)).toBeInTheDocument();
    expect(screen.queryByText('Wissensfrage')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /Wo ist die Mensa/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));

    fireEvent.click(screen.getByRole('button', { name: 'Rallye erstellen' }));

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Studieninfotag 2027',
          departmentId: 7,
          questionIds: [1],
        })
      )
    );
    expect(mockPush).toHaveBeenCalledWith('/rallyes/42');
  });

  it('disables Weiter until a name is entered', () => {
    render(
      <RallyeCreateWizard
        departmentOptions={departmentOptions}
        defaultDepartmentId={null}
        questions={questions}
        categories={[]}
      />
    );
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeDisabled();
  });

  it('allows skipping the question step', async () => {
    mockCreate.mockResolvedValue({
      success: true,
      data: { rallyeId: 43, message: 'ok' },
    });
    render(
      <RallyeCreateWizard
        departmentOptions={departmentOptions}
        defaultDepartmentId={7}
        questions={questions}
        categories={[]}
      />
    );
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Ohne Fragen' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    expect(screen.getByLabelText('Rallye-Code (optional)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rallye erstellen' }));
    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ questionIds: [] })
      )
    );
  });

  it('shows the action error', async () => {
    mockCreate.mockResolvedValue({ success: false, error: 'Kaputt' });
    render(
      <RallyeCreateWizard
        departmentOptions={departmentOptions}
        defaultDepartmentId={7}
        questions={[]}
        categories={[]}
      />
    );
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'X' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rallye erstellen' }));
    await waitFor(() => expect(screen.getByText('Kaputt')).toBeInTheDocument());
    expect(mockPush).not.toHaveBeenCalled();
  });
});
