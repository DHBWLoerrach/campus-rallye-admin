import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RallyePhaseControls from './RallyePhaseControls';

const { mockAdvance, mockDuplicate, mockPush } = vi.hoisted(() => ({
  mockAdvance: vi.fn(),
  mockDuplicate: vi.fn(),
  mockPush: vi.fn(),
}));

vi.mock('@/actions/rallye', () => ({
  advanceRallyeStatus: mockAdvance,
  duplicateRallye: mockDuplicate,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('RallyePhaseControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the action for the current phase', () => {
    render(
      <RallyePhaseControls
        rallyeId={5}
        status="inactive"
        hasVotingQuestions={false}
      />
    );
    expect(
      screen.getByRole('button', { name: 'Rallye starten' })
    ).toBeInTheDocument();
  });

  it('skips voting when there are no voting questions', () => {
    render(
      <RallyePhaseControls
        rallyeId={5}
        status="running"
        hasVotingQuestions={false}
      />
    );
    expect(
      screen.getByRole('button', { name: 'Ranking zeigen' })
    ).toBeInTheDocument();
  });

  it('offers duplication when the rallye has ended', async () => {
    mockDuplicate.mockResolvedValue({
      success: true,
      data: { rallyeId: 99, message: 'ok' },
    });
    render(
      <RallyePhaseControls
        rallyeId={5}
        status="ended"
        hasVotingQuestions={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Duplizieren' }));
    await waitFor(() => expect(mockDuplicate).toHaveBeenCalledWith(5));
    expect(mockPush).toHaveBeenCalledWith('/rallyes/99');
  });

  it('shows the error when duplication fails', async () => {
    mockDuplicate.mockResolvedValue({ success: false, error: 'Kaputt' });
    render(
      <RallyePhaseControls
        rallyeId={5}
        status="ended"
        hasVotingQuestions={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Duplizieren' }));
    await waitFor(() => expect(screen.getByText('Kaputt')).toBeInTheDocument());
  });

  it('opens a confirmation dialog and calls the action on confirm', async () => {
    mockAdvance.mockResolvedValue({ success: true, data: { message: 'ok' } });
    render(
      <RallyePhaseControls
        rallyeId={5}
        status="inactive"
        hasVotingQuestions={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Rallye starten' }));
    expect(
      screen.getByText(
        'Teams können ab jetzt beitreten und die Fragen beantworten.'
      )
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Bestätigen' }));
    await waitFor(() => {
      expect(mockAdvance).toHaveBeenCalledWith(5, 'running');
    });
  });
});
