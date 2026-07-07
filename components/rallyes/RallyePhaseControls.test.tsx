import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RallyePhaseControls from './RallyePhaseControls';

const { mockAdvance } = vi.hoisted(() => ({ mockAdvance: vi.fn() }));
vi.mock('@/actions/rallye', () => ({ advanceRallyeStatus: mockAdvance }));

describe('RallyePhaseControls', () => {
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

  it('renders nothing when the rallye has ended', () => {
    const { container } = render(
      <RallyePhaseControls
        rallyeId={5}
        status="ended"
        hasVotingQuestions={false}
      />
    );
    expect(container).toBeEmptyDOMElement();
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
