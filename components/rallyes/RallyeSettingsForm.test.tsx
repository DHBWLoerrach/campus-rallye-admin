import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RallyeSettingsForm from './RallyeSettingsForm';

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
    const end = new Date(hidden.value);
    expect(end.getHours()).toBe(18);
    expect(end.getMinutes()).toBe(30);
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
