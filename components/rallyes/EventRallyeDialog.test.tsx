import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EventRallyeDialog from './EventRallyeDialog';

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

describe('EventRallyeDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preselects the only organization and submits with automatically assigned event department', async () => {
    mockCreateRallye.mockResolvedValue({
      success: true,
      data: { message: 'Rallye erfolgreich gespeichert', rallyeId: 42 },
    });

    render(
      <EventRallyeDialog
        buttonStyle=""
        organizations={[{ id: 10, name: 'Org A', hasEventDepartment: true }]}
        eventDepartmentIdByOrganizationId={{ '10': 100 }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Event erstellen' }));
    expect(screen.getByRole('combobox', { name: 'Organisation' })).toHaveTextContent(
      'Org A'
    );
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Girls Day' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    await waitFor(() => {
      expect(mockCreateRallye).toHaveBeenCalledTimes(1);
    });

    const submittedFormData = mockCreateRallye.mock.calls[0][1] as FormData;
    expect(submittedFormData.get('name')).toBe('Girls Day');
    expect(submittedFormData.get('organization_id')).toBe('10');
    expect(submittedFormData.getAll('department_ids')).toEqual(['100']);
    expect(mockRefresh).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: 'Fragen zuordnen' })
      ).toHaveAttribute('href', '/rallyes/42/questions');
    });
  });

  it('disables save when no event department mapping exists for the selected organization', async () => {
    render(
      <EventRallyeDialog
        buttonStyle=""
        organizations={[{ id: 20, name: 'Org B', hasEventDepartment: false }]}
        eventDepartmentIdByOrganizationId={{}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Event erstellen' }));
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Open Day' },
    });
    const orgTrigger = screen.getByRole('combobox', { name: 'Organisation' });
    fireEvent.click(orgTrigger);
    fireEvent.click(screen.getByRole('option', { name: 'Org B' }));

    expect(
      screen.getByText(
        'Für diese Organisation wurde keine passende Event-Abteilung gefunden.'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Speichern' })).toBeDisabled();
    expect(mockCreateRallye).not.toHaveBeenCalled();
  });
});
