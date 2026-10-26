import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RallyeResetSection from './RallyeResetSection';

const { mockResetRallye, mockRefresh, mockDownloadFile } = vi.hoisted(() => ({
  mockResetRallye: vi.fn(),
  mockRefresh: vi.fn(),
  mockDownloadFile: vi.fn(),
}));

vi.mock('@/actions/rallye', () => ({
  resetRallye: mockResetRallye,
}));

vi.mock('@/lib/download-file', () => ({
  downloadFile: mockDownloadFile,
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

  it('blocks the reset until the photo download is complete', async () => {
    let finishDownload: () => void = () => {};
    mockDownloadFile.mockReturnValue(
      new Promise<void>((resolve) => {
        finishDownload = resolve;
      })
    );
    render(
      <RallyeResetSection
        rallyeId={5}
        rallyeName="Studieninfotag"
        status="ended"
        runDataSummary={summary}
      />
    );

    const dialog = openDialog();
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: '2 Fotos herunterladen (ZIP)',
      })
    );

    expect(mockDownloadFile).toHaveBeenCalledWith(
      '/rallyes/5/uploads/download',
      'upload-fotos.zip'
    );
    expect(dialog).toHaveTextContent('Zurücksetzen ist bis dahin gesperrt.');
    expect(confirmButton(dialog)).toBeDisabled();

    finishDownload();

    await waitFor(() => expect(confirmButton(dialog)).toBeEnabled());
    expect(dialog).toHaveTextContent('Fotos heruntergeladen.');
  });

  it('keeps the reset blocked when the dialog is reopened during the download', () => {
    mockDownloadFile.mockReturnValue(new Promise<void>(() => {}));
    render(
      <RallyeResetSection
        rallyeId={5}
        rallyeName="Studieninfotag"
        status="ended"
        runDataSummary={summary}
      />
    );

    let dialog = openDialog();
    fireEvent.click(
      within(dialog).getByRole('button', { name: /herunterladen/ })
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Abbrechen' }));
    dialog = openDialog();

    expect(confirmButton(dialog)).toBeDisabled();
  });

  it('unblocks the reset and reports a failed photo download', async () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    mockDownloadFile.mockRejectedValue(new Error('500'));
    render(
      <RallyeResetSection
        rallyeId={5}
        rallyeName="Studieninfotag"
        status="ended"
        runDataSummary={summary}
      />
    );

    const dialog = openDialog();
    fireEvent.click(
      within(dialog).getByRole('button', { name: /herunterladen/ })
    );

    await waitFor(() =>
      expect(dialog).toHaveTextContent('Download fehlgeschlagen.')
    );
    expect(confirmButton(dialog)).toBeEnabled();
    consoleError.mockRestore();
  });

  it.each([
    ['no photo was uploaded', { ...summary, uploadPhotoCount: 0 }],
    ['the counts are unknown', null],
  ])('offers no photo download when %s', (_case, runDataSummary) => {
    render(
      <RallyeResetSection
        rallyeId={5}
        rallyeName="Studieninfotag"
        status="ended"
        runDataSummary={runDataSummary}
      />
    );

    const dialog = openDialog();

    expect(
      within(dialog).queryByRole('button', { name: /herunterladen/ })
    ).not.toBeInTheDocument();
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

  it('reminds that an ended rallye still stores its run data', () => {
    render(
      <RallyeResetSection
        rallyeId={5}
        rallyeName="Studieninfotag"
        status="ended"
        runDataSummary={summary}
      />
    );

    expect(
      screen.getByText(
        /3 Teams, 1 Team-Antwort und 2 Upload-Fotos sind noch gespeichert/
      )
    ).toBeInTheDocument();
  });

  it.each([
    ['the rallye is not ended yet', 'results' as const, summary],
    [
      'no run data is stored',
      'ended' as const,
      { teamCount: 0, teamAnswerCount: 0, uploadPhotoCount: 0 },
    ],
    ['the counts are unknown', 'ended' as const, null],
  ])('shows no stored run data reminder when %s', (_, status, runData) => {
    render(
      <RallyeResetSection
        rallyeId={5}
        rallyeName="Studieninfotag"
        status={status}
        runDataSummary={runData}
      />
    );

    expect(screen.queryByText(/noch gespeichert/)).not.toBeInTheDocument();
  });

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
