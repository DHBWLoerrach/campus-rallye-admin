import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RallyePhaseControls from './RallyePhaseControls';
import { getZonedHourMinute } from '@/lib/planned-end';

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
    expect(screen.getByText('Endet heute um (optional)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Bestätigen' }));
    await waitFor(() => {
      expect(mockAdvance).toHaveBeenCalledWith(5, 'running', undefined);
    });
  });

  it("combines the chosen time with today's date when starting", async () => {
    mockAdvance.mockResolvedValue({ success: true, data: { message: 'ok' } });
    render(
      <RallyePhaseControls
        rallyeId={5}
        status="inactive"
        hasVotingQuestions={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Rallye starten' }));
    fireEvent.change(screen.getByLabelText('Stunde'), {
      target: { value: '18' },
    });
    fireEvent.change(screen.getByLabelText('Minute'), {
      target: { value: '30' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Bestätigen' }));
    await waitFor(() => {
      expect(mockAdvance).toHaveBeenCalledWith(
        5,
        'running',
        expect.any(String)
      );
    });
    const iso = mockAdvance.mock.calls[0][2] as string;
    // The time is interpreted in the fixed organizer timezone, not the local
    // one, so assert against the Berlin wall-clock and Berlin calendar day.
    expect(getZonedHourMinute(new Date(iso))).toEqual({ hour: 18, minute: 30 });
    const berlinDay = (date: Date) =>
      date.toLocaleDateString('en-CA', { timeZone: 'Europe/Berlin' });
    expect(berlinDay(new Date(iso))).toBe(berlinDay(new Date()));
  });

  it('warns about a past end time without blocking the start', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-07-08T12:00:00'));
    try {
      render(
        <RallyePhaseControls
          rallyeId={5}
          status="inactive"
          hasVotingQuestions={false}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Rallye starten' }));
      fireEvent.change(screen.getByLabelText('Stunde'), {
        target: { value: '8' },
      });
      expect(
        screen.getByText('Diese Uhrzeit liegt bereits in der Vergangenheit.')
      ).toBeInTheDocument();
      // Confirming is still possible despite the warning.
      expect(screen.getByRole('button', { name: 'Bestätigen' })).toBeEnabled();

      fireEvent.change(screen.getByLabelText('Stunde'), {
        target: { value: '18' },
      });
      expect(
        screen.queryByText('Diese Uhrzeit liegt bereits in der Vergangenheit.')
      ).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('blocks starting with an invalid end time instead of dropping it', () => {
    render(
      <RallyePhaseControls
        rallyeId={5}
        status="inactive"
        hasVotingQuestions={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Rallye starten' }));
    fireEvent.change(screen.getByLabelText('Stunde'), {
      target: { value: '24' },
    });

    expect(
      screen.getByText(
        'Bitte eine gültige Uhrzeit angeben (Stunde 0–23, Minute 0–59).'
      )
    ).toBeInTheDocument();
    const confirm = screen.getByRole('button', { name: 'Bestätigen' });
    expect(confirm).toBeDisabled();
    fireEvent.click(confirm);
    expect(mockAdvance).not.toHaveBeenCalled();
  });

  it('offers no planned-end field for later transitions', () => {
    render(
      <RallyePhaseControls
        rallyeId={5}
        status="running"
        hasVotingQuestions={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ranking zeigen' }));
    expect(
      screen.queryByText('Endet heute um (optional)')
    ).not.toBeInTheDocument();
  });
});
