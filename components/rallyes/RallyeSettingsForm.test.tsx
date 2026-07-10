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
  end_time: '18:30:00',
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

  it('leaves the time input empty when no end is planned', () => {
    render(
      <RallyeSettingsForm
        rallye={{ ...baseRallye, end_time: null }}
        departmentOptions={[{ id: 10, name: 'Informatik' }]}
        assignedDepartmentIds={[10]}
      />
    );

    expect(screen.getByLabelText('Geplantes Ende')).toHaveDisplayValue('');
  });

  it('seeds the time input from the stored local time', () => {
    render(
      <RallyeSettingsForm
        rallye={baseRallye}
        departmentOptions={[{ id: 10, name: 'Informatik' }]}
        assignedDepartmentIds={[10]}
      />
    );

    expect(screen.getByLabelText('Geplantes Ende')).toHaveDisplayValue('18:30');
  });

  it('submits the chosen local time', () => {
    render(
      <RallyeSettingsForm
        rallye={{ ...baseRallye, end_time: null }}
        departmentOptions={[{ id: 10, name: 'Informatik' }]}
        assignedDepartmentIds={[10]}
      />
    );

    fireEvent.change(screen.getByLabelText('Geplantes Ende'), {
      target: { value: '18:30' },
    });

    expect(screen.getByLabelText('Geplantes Ende')).toHaveDisplayValue('18:30');
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
