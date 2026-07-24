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
        status="ready"
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
      screen.getByRole('button', { name: 'Ergebnisse anzeigen' })
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

  it('starts without a planned end when the time is empty', async () => {
    mockAdvance.mockResolvedValue({ success: true, data: { message: 'ok' } });
    render(
      <RallyePhaseControls
        rallyeId={5}
        status="ready"
        hasVotingQuestions={false}
        rallyeCode="join42"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Rallye starten' }));
    expect(screen.getByText('Endet um (optional)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Bestätigen' }));
    await waitFor(() => {
      expect(mockAdvance).toHaveBeenCalledWith(
        5,
        'running',
        undefined,
        undefined
      );
    });
  });

  it('passes the chosen local time when starting', async () => {
    mockAdvance.mockResolvedValue({ success: true, data: { message: 'ok' } });
    render(
      <RallyePhaseControls
        rallyeId={5}
        status="ready"
        hasVotingQuestions={false}
        rallyeCode="join42"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Rallye starten' }));
    fireEvent.change(screen.getByLabelText('Endet um (optional)'), {
      target: { value: '18:30' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Bestätigen' }));
    await waitFor(() => {
      expect(mockAdvance).toHaveBeenCalledWith(
        5,
        'running',
        '18:30',
        undefined
      );
    });
  });

  it('does not ask for a code when one is already stored', () => {
    render(
      <RallyePhaseControls
        rallyeId={5}
        status="ready"
        hasVotingQuestions={false}
        rallyeCode="join42"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Rallye starten' }));
    expect(screen.queryByLabelText('Rallye-Code')).not.toBeInTheDocument();
  });

  it('asks for a code and passes it when none is stored', async () => {
    mockAdvance.mockResolvedValue({ success: true, data: { message: 'ok' } });
    render(
      <RallyePhaseControls
        rallyeId={5}
        status="ready"
        hasVotingQuestions={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Rallye starten' }));
    const codeInput = screen.getByLabelText('Rallye-Code');
    // A suggestion is prefilled so the organizer can start with one click.
    expect((codeInput as HTMLInputElement).value.length).toBeGreaterThan(0);
    fireEvent.change(codeInput, { target: { value: 'meincode' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bestätigen' }));
    await waitFor(() =>
      expect(mockAdvance).toHaveBeenCalledWith(
        5,
        'running',
        undefined,
        'meincode'
      )
    );
  });

  it('blocks starting while the code field is empty', () => {
    render(
      <RallyePhaseControls
        rallyeId={5}
        status="ready"
        hasVotingQuestions={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Rallye starten' }));
    fireEvent.change(screen.getByLabelText('Rallye-Code'), {
      target: { value: '   ' },
    });
    expect(screen.getByRole('button', { name: 'Bestätigen' })).toBeDisabled();
  });

  it('warns about unmarked upload questions but still allows confirming', async () => {
    mockAdvance.mockResolvedValue({ success: true, data: { message: 'ok' } });
    render(
      <RallyePhaseControls
        rallyeId={5}
        status="running"
        hasVotingQuestions={false}
        unmarkedUploadWithPoints={2}
      />
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Ergebnisse anzeigen' })
    );
    expect(
      screen.getByText(/2 Upload-Fragen mit Punktwert/)
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Bestätigen' }));
    await waitFor(() =>
      expect(mockAdvance).toHaveBeenCalledWith(
        5,
        'results',
        undefined,
        undefined
      )
    );
  });

  it('shows no upload warning when every scored upload votes', () => {
    render(
      <RallyePhaseControls
        rallyeId={5}
        status="running"
        hasVotingQuestions
        unmarkedUploadWithPoints={0}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Abstimmung starten' }));
    expect(
      screen.queryByText(/keine Abstimmung vorgesehen/)
    ).not.toBeInTheDocument();
  });

  it('offers no planned-end field for later transitions', () => {
    render(
      <RallyePhaseControls
        rallyeId={5}
        status="running"
        hasVotingQuestions={false}
      />
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Ergebnisse anzeigen' })
    );
    expect(screen.queryByText('Endet um (optional)')).not.toBeInTheDocument();
  });
});
