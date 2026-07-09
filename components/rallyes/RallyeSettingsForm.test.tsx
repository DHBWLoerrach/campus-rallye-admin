import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RallyeSettingsForm from './RallyeSettingsForm';
import { getZonedHourMinute } from '@/lib/planned-end';

const { mockUpdateRallye, mockDeleteRallye, mockPush } = vi.hoisted(() => ({
  mockUpdateRallye: vi.fn(),
  mockDeleteRallye: vi.fn(),
  mockPush: vi.fn(),
}));

vi.mock('@/actions/rallye', () => ({
  updateRallye: mockUpdateRallye,
  deleteRallye: mockDeleteRallye,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const baseRallye = {
  id: 1,
  name: 'Test Rallye',
  status: 'inactive' as const,
  end_time: '2026-01-01T00:00:00.000Z',
  password: '',
  created_at: '2026-01-01T00:00:00.000Z',
};

describe('RallyeSettingsForm', () => {
  it('renders form fields with hidden status and department sync inputs', () => {
    const { container } = render(
      <RallyeSettingsForm
        rallye={baseRallye}
        departmentOptions={[{ id: 10, name: 'Informatik' }]}
        assignedDepartmentIds={[10]}
      />
    );

    expect(screen.getByLabelText('Name')).toHaveValue('Test Rallye');
    expect(
      container.querySelector('input[name="status"][value="inactive"]')
    ).not.toBeNull();
    expect(
      container.querySelector('input[name="department_sync"][value="1"]')
    ).not.toBeNull();
    expect(
      container.querySelector('input[name="department_ids"][value="10"]')
    ).not.toBeNull();
    expect(
      screen.getByText('Status manuell setzen (Experten-Modus)')
    ).toBeInTheDocument();
  });

  it('disables saving when departments exist but none is selected', () => {
    render(
      <RallyeSettingsForm
        rallye={baseRallye}
        departmentOptions={[{ id: 10, name: 'Informatik' }]}
        assignedDepartmentIds={[]}
      />
    );

    expect(screen.getByRole('button', { name: 'Speichern' })).toBeDisabled();
  });

  it('leaves the end time empty when none is planned', () => {
    const { container } = render(
      <RallyeSettingsForm
        rallye={{ ...baseRallye, end_time: null }}
        departmentOptions={[{ id: 10, name: 'Informatik' }]}
        assignedDepartmentIds={[10]}
      />
    );

    expect(screen.getByLabelText('Stunde')).toHaveDisplayValue('');
    expect(screen.getByLabelText('Minute')).toHaveDisplayValue('');
    expect(container.querySelector('input[name="end_time"]')).toHaveValue('');
  });

  it('seeds the fields from the stored end in Berlin time, not the local zone', () => {
    render(
      <RallyeSettingsForm
        rallye={{ ...baseRallye, end_time: '2026-07-08T16:30:00.000Z' }}
        departmentOptions={[{ id: 10, name: 'Informatik' }]}
        assignedDepartmentIds={[10]}
      />
    );

    // 16:30Z is 18:30 in Europe/Berlin (CEST); the suite runs in
    // America/New_York, where reading the local hour would wrongly show 12:30.
    expect(screen.getByLabelText('Stunde')).toHaveDisplayValue('18');
    expect(screen.getByLabelText('Minute')).toHaveDisplayValue('30');
  });

  it('submits the chosen 24-hour time on the rallye day', () => {
    const { container } = render(
      <RallyeSettingsForm
        rallye={{ ...baseRallye, end_time: null }}
        departmentOptions={[{ id: 10, name: 'Informatik' }]}
        assignedDepartmentIds={[10]}
      />
    );

    fireEvent.change(screen.getByLabelText('Stunde'), {
      target: { value: '18' },
    });
    fireEvent.change(screen.getByLabelText('Minute'), {
      target: { value: '30' },
    });

    const hidden = container.querySelector(
      'input[name="end_time"]'
    ) as HTMLInputElement;
    // The time is interpreted in the fixed organizer timezone, so assert
    // against the Berlin wall-clock rather than the local one.
    expect(getZonedHourMinute(new Date(hidden.value))).toEqual({
      hour: 18,
      minute: 30,
    });
  });

  it('warns when the entered end time is already in the past', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-07-08T12:00:00'));
    try {
      render(
        <RallyeSettingsForm
          rallye={{ ...baseRallye, end_time: null }}
          departmentOptions={[{ id: 10, name: 'Informatik' }]}
          assignedDepartmentIds={[10]}
        />
      );

      fireEvent.change(screen.getByLabelText('Stunde'), {
        target: { value: '8' },
      });
      expect(
        screen.getByText('Diese Uhrzeit liegt bereits in der Vergangenheit.')
      ).toBeInTheDocument();

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

  it('blocks saving with an invalid end time', () => {
    render(
      <RallyeSettingsForm
        rallye={{ ...baseRallye, end_time: null }}
        departmentOptions={[{ id: 10, name: 'Informatik' }]}
        assignedDepartmentIds={[10]}
      />
    );

    fireEvent.change(screen.getByLabelText('Stunde'), {
      target: { value: '24' },
    });

    expect(
      screen.getByText(
        'Bitte eine gültige Uhrzeit angeben (Stunde 0–23, Minute 0–59).'
      )
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Speichern' })).toBeDisabled();
  });

  it('omits department sync and allows saving when no departments exist', () => {
    const { container } = render(
      <RallyeSettingsForm
        rallye={baseRallye}
        departmentOptions={[]}
        assignedDepartmentIds={[]}
      />
    );

    expect(container.querySelector('input[name="department_sync"]')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Speichern' })
    ).not.toBeDisabled();
  });

  it('shows the danger zone with a delete dialog trigger', () => {
    render(
      <RallyeSettingsForm
        rallye={baseRallye}
        departmentOptions={[{ id: 10, name: 'Informatik' }]}
        assignedDepartmentIds={[10]}
      />
    );

    expect(screen.getByText('Rallye löschen')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Löschen' })).toBeInTheDocument();
  });
});
