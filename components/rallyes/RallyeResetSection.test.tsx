import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RallyeResetSection from './RallyeResetSection';

const { mockResetRallye, mockRefresh } = vi.hoisted(() => ({
  mockResetRallye: vi.fn(),
  mockRefresh: vi.fn(),
}));

vi.mock('@/actions/rallye', () => ({
  resetRallye: mockResetRallye,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const summary = { teamCount: 3, teamAnswerCount: 1, uploadPhotoCount: 2 };

const openDialog = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Zurücksetzen' }));
  return screen.getByRole('dialog');
};

const confirmButton = (dialog: HTMLElement) =>
  Array.from(dialog.querySelectorAll('button')).find(
    (button) => button.textContent === 'Zurücksetzen'
  ) as HTMLButtonElement;

describe('RallyeResetSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists the run data that will be deleted', () => {
    render(
      <RallyeResetSection
        rallyeId={5}
        rallyeName="Studieninfotag"
        status="ended"
        runDataSummary={summary}
      />
    );

    const dialog = openDialog();

    expect(dialog).toHaveTextContent(
      '3 Teams, 1 Team-Antwort und 2 Upload-Fotos werden endgültig gelöscht.'
    );
  });

  it('falls back to a generic warning when the counts are unknown', () => {
    render(
      <RallyeResetSection
        rallyeId={5}
        rallyeName="Studieninfotag"
        status="ended"
        runDataSummary={null}
      />
    );

    const dialog = openDialog();

    expect(dialog).toHaveTextContent(
      'Alle Teams, Team-Antworten und Upload-Fotos werden endgültig gelöscht.'
    );
  });

  it('resets without typing the name once the rallye is over', async () => {
    mockResetRallye.mockResolvedValue({
      success: true,
      data: { message: 'ok' },
    });
    render(
      <RallyeResetSection
        rallyeId={5}
        rallyeName="Studieninfotag"
        status="ended"
        runDataSummary={summary}
      />
    );

    const dialog = openDialog();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    fireEvent.click(confirmButton(dialog));

    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(mockResetRallye).toHaveBeenCalledWith(5);
  });

  it.each(['running', 'voting'] as const)(
    'requires typing the rallye name while it is %s',
    (status) => {
      render(
        <RallyeResetSection
          rallyeId={5}
          rallyeName="Studieninfotag"
          status={status}
          runDataSummary={summary}
        />
      );

      const dialog = openDialog();
      const button = confirmButton(dialog);
      const input = screen.getByLabelText(/Namen der Rallye eingeben/);

      expect(button).toBeDisabled();
      fireEvent.change(input, { target: { value: 'Studieninfo' } });
      expect(button).toBeDisabled();
      fireEvent.change(input, { target: { value: 'Studieninfotag' } });
      expect(button).not.toBeDisabled();
    }
  );

  it('shows the error and keeps the dialog open when the reset fails', async () => {
    mockResetRallye.mockResolvedValue({
      success: false,
      error: 'Fehler beim Zurücksetzen der Rallye',
    });
    render(
      <RallyeResetSection
        rallyeId={5}
        rallyeName="Studieninfotag"
        status="ended"
        runDataSummary={summary}
      />
    );

    const dialog = openDialog();
    fireEvent.click(confirmButton(dialog));

    expect(
      await screen.findByText('Fehler beim Zurücksetzen der Rallye')
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
