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
  status: 'ready' as const,
  rallye_end: '18:30:00',
  rallye_code: '',
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
    expect(screen.getByLabelText('Rallye-Code')).toHaveAttribute(
      'type',
      'text'
    );
    expect(screen.getByLabelText('Rallye-Code')).toHaveValue('');
    expect(
      screen.getByText(
        'Teams benötigen diesen Code, um der Rallye beizutreten.'
      )
    ).toBeInTheDocument();
    expect(
      container.querySelector('input[name="status"][value="ready"]')
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
        rallye={{ ...baseRallye, rallye_end: null }}
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
        rallye={{ ...baseRallye, rallye_end: null }}
        departmentOptions={[{ id: 10, name: 'Informatik' }]}
        assignedDepartmentIds={[10]}
      />
    );

    fireEvent.change(screen.getByLabelText('Geplantes Ende'), {
      target: { value: '18:30' },
    });

    expect(screen.getByLabelText('Geplantes Ende')).toHaveDisplayValue('18:30');
  });

  // Finishing the draft in the header dialog refreshes the page while this form
  // stays mounted; saving afterwards must not write the old values back.
  it('takes over status, code and end changed outside the form', () => {
    const draft = {
      ...baseRallye,
      status: 'draft' as const,
      rallye_code: '',
      rallye_end: null,
    };
    const { container, rerender } = render(
      <RallyeSettingsForm
        rallye={draft}
        departmentOptions={[{ id: 10, name: 'Informatik' }]}
        assignedDepartmentIds={[10]}
      />
    );

    rerender(
      <RallyeSettingsForm
        rallye={{
          ...draft,
          status: 'ready',
          rallye_code: 'campus-427',
          rallye_end: '18:30:00',
        }}
        departmentOptions={[{ id: 10, name: 'Informatik' }]}
        assignedDepartmentIds={[10]}
      />
    );

    expect(screen.getByLabelText('Rallye-Code')).toHaveValue('campus-427');
    expect(screen.getByLabelText('Geplantes Ende')).toHaveDisplayValue('18:30');
    expect(
      container.querySelector('input[name="status"][value="ready"]')
    ).not.toBeNull();
  });

  it('keeps unsaved edits of fields that did not change outside the form', () => {
    const { rerender } = render(
      <RallyeSettingsForm
        rallye={{ ...baseRallye, status: 'draft' }}
        departmentOptions={[{ id: 10, name: 'Informatik' }]}
        assignedDepartmentIds={[10]}
      />
    );
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Neuer Name' },
    });

    rerender(
      <RallyeSettingsForm
        rallye={{ ...baseRallye, status: 'ready', rallye_code: 'campus-427' }}
        departmentOptions={[{ id: 10, name: 'Informatik' }]}
        assignedDepartmentIds={[10]}
      />
    );

    expect(screen.getByLabelText('Name')).toHaveValue('Neuer Name');
    expect(screen.getByLabelText('Rallye-Code')).toHaveValue('campus-427');
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
