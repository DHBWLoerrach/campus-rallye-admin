import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RallyePhaseControls from './RallyePhaseControls';

const { mockAdvance } = vi.hoisted(() => ({
  mockAdvance: vi.fn(),
}));

vi.mock('@/actions/rallye', () => ({
  advanceRallyeStatus: mockAdvance,
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

  // Repeating an ended rallye is done by resetting it in the settings, so
  // the header offers no further action.
  it('offers no action once the rallye has ended', () => {
    render(
      <RallyePhaseControls
        rallyeId={5}
        status="ended"
        hasVotingQuestions={false}
      />
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
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

  it('shows the stored code and the one-device hint when starting', () => {
    render(
      <RallyePhaseControls
        rallyeId={5}
        status="ready"
        hasVotingQuestions={false}
        rallyeCode="join42"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Rallye starten' }));
    expect(screen.getByText('join42')).toBeInTheDocument();
    expect(
      screen.getByText('Jedes Team spielt auf genau einem Gerät.')
    ).toBeInTheDocument();
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
    expect(
      screen.getByText('Jedes Team spielt auf genau einem Gerät.')
    ).toBeInTheDocument();
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

  // Teams can already join a ready rallye, so the code is required when
  // finishing the draft, not only when starting.
  it('asks for a code when finishing a draft without one', async () => {
    mockAdvance.mockResolvedValue({ success: true, data: { message: 'ok' } });
    render(
      <RallyePhaseControls
        rallyeId={5}
        status="draft"
        hasVotingQuestions={false}
      />
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Entwurf abschließen' })
    );
    const codeInput = screen.getByLabelText('Rallye-Code');
    expect((codeInput as HTMLInputElement).value.length).toBeGreaterThan(0);
    fireEvent.change(codeInput, { target: { value: 'meincode' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bestätigen' }));
    await waitFor(() =>
      expect(mockAdvance).toHaveBeenCalledWith(
        5,
        'ready',
        undefined,
        'meincode'
      )
    );
  });

  it('blocks finishing the draft while the code field is empty', () => {
    render(
      <RallyePhaseControls
        rallyeId={5}
        status="draft"
        hasVotingQuestions={false}
      />
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Entwurf abschließen' })
    );
    fireEvent.change(screen.getByLabelText('Rallye-Code'), {
      target: { value: '' },
    });
    expect(screen.getByRole('button', { name: 'Bestätigen' })).toBeDisabled();
  });

  it('shows the stored code when finishing a draft that has one', async () => {
    mockAdvance.mockResolvedValue({ success: true, data: { message: 'ok' } });
    render(
      <RallyePhaseControls
        rallyeId={5}
        status="draft"
        hasVotingQuestions={false}
        rallyeCode="join42"
      />
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Entwurf abschließen' })
    );
    expect(screen.queryByLabelText('Rallye-Code')).not.toBeInTheDocument();
    expect(screen.getByText('join42')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Bestätigen' }));
    await waitFor(() =>
      expect(mockAdvance).toHaveBeenCalledWith(5, 'ready', undefined, undefined)
    );
  });

  // The page keeps this component mounted while the status changes (e.g. a
  // reset back to draft), so the suggestion must not depend on the initial
  // status.
  it('suggests a code after the status changed without remounting', () => {
    const { rerender } = render(
      <RallyePhaseControls
        rallyeId={5}
        status="ended"
        hasVotingQuestions={false}
      />
    );
    rerender(
      <RallyePhaseControls
        rallyeId={5}
        status="draft"
        hasVotingQuestions={false}
      />
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Entwurf abschließen' })
    );
    const codeInput = screen.getByLabelText('Rallye-Code') as HTMLInputElement;
    expect(codeInput.value.length).toBeGreaterThan(0);
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

  it('reminds about printing QR codes when finishing the draft', () => {
    render(
      <RallyePhaseControls
        rallyeId={5}
        status="draft"
        hasVotingQuestions={false}
        qrPrintCount={3}
      />
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Entwurf abschließen' })
    );
    expect(screen.getByText(/3 Fragen mit QR-Code/)).toBeInTheDocument();
  });

  it('shows no QR print hint without QR-based questions', () => {
    render(
      <RallyePhaseControls
        rallyeId={5}
        status="draft"
        hasVotingQuestions={false}
        qrPrintCount={0}
      />
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Entwurf abschließen' })
    );
    expect(screen.queryByText(/Frage.* mit QR-Code/)).not.toBeInTheDocument();
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
