import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProgramRallyeDialog from './ProgramRallyeDialog';

const { mockCreateRallye, mockRefresh } = vi.hoisted(() => ({
  mockCreateRallye: vi.fn(),
  mockRefresh: vi.fn(),
}));

vi.mock('@/actions/rallye', () => ({
  createRallye: mockCreateRallye,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

describe('ProgramRallyeDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits with exactly one selected program department and refreshes the page', async () => {
    mockCreateRallye.mockResolvedValue({
      success: true,
      data: { message: 'Rallye erfolgreich gespeichert', rallyeId: 77 },
    });

    render(
      <ProgramRallyeDialog
        buttonStyle=""
        departments={[
          { id: 101, name: 'Informatik' },
          { id: 102, name: 'BWL' },
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Rallye erstellen' }));
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Informatik Semester 1' },
    });
    const departmentTrigger = screen.getByRole('combobox', { name: 'Abteilung' });
    fireEvent.click(departmentTrigger);
    fireEvent.click(screen.getByRole('option', { name: 'Informatik' }));
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    await waitFor(() => {
      expect(mockCreateRallye).toHaveBeenCalledTimes(1);
    });

    const submittedFormData = mockCreateRallye.mock.calls[0][1] as FormData;
    expect(submittedFormData.get('name')).toBe('Informatik Semester 1');
    expect(submittedFormData.getAll('department_ids')).toEqual(['101']);
    expect(mockRefresh).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: 'Fragen zuordnen' })
      ).toHaveAttribute('href', '/rallyes/77/questions');
    });
  });

  it('disables save when no program departments are available', () => {
    render(<ProgramRallyeDialog buttonStyle="" departments={[]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Rallye erstellen' }));
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'New Rallye' },
    });

    expect(
      screen.getByText('Keine geeigneten Studiengangs-Abteilungen verfügbar.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Speichern' })).toBeDisabled();
    expect(mockCreateRallye).not.toHaveBeenCalled();
  });
});
