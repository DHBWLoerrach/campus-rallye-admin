import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RallyeForm from './RallyeForm';

const { mockUpdateRallye, mockDeleteRallye, mockResetRallye } = vi.hoisted(() => ({
  mockUpdateRallye: vi.fn(),
  mockDeleteRallye: vi.fn(),
  mockResetRallye: vi.fn(),
}));

vi.mock('@/actions/rallye', () => ({
  updateRallye: mockUpdateRallye,
  deleteRallye: mockDeleteRallye,
  resetRallye: mockResetRallye,
}));

const baseRallye = {
  id: 1,
  name: 'Test Rallye',
  status: 'inactive' as const,
  end_time: '2026-01-01T00:00:00.000Z',
  password: '',
  created_at: '2026-01-01T00:00:00.000Z',
};

describe('RallyeForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hides department assignment fields when allowDepartmentAssignments is false', () => {
    const { container } = render(
      <RallyeForm
        rallye={baseRallye}
        onCancel={vi.fn()}
        departmentOptions={[{ id: 10, name: 'Informatik' }]}
        assignedDepartmentIds={[10]}
        departmentAssignmentsLoaded={true}
        allowDepartmentAssignments={false}
      />
    );

    expect(screen.queryByText('Abteilungen zuordnen')).not.toBeInTheDocument();
    expect(container.querySelector('input[name="department_sync"]')).toBeNull();
    expect(container.querySelector('input[name="department_ids"]')).toBeNull();
  });

  it('keeps department assignment fields when allowDepartmentAssignments is true', () => {
    const { container } = render(
      <RallyeForm
        rallye={baseRallye}
        onCancel={vi.fn()}
        departmentOptions={[{ id: 10, name: 'Informatik' }]}
        assignedDepartmentIds={[10]}
        departmentAssignmentsLoaded={true}
        allowDepartmentAssignments={true}
      />
    );

    expect(screen.getByText('Abteilungen zuordnen')).toBeInTheDocument();
    expect(container.querySelector('input[name="department_sync"]')).not.toBeNull();
    expect(
      container.querySelector('input[name="department_ids"][value="10"]')
    ).not.toBeNull();
  });

  it('confirms and triggers rallye reset', async () => {
    mockResetRallye.mockResolvedValue({
      success: true,
      data: { message: 'Rallye erfolgreich zurückgesetzt' },
    });
    const onCancel = vi.fn();

    render(
      <RallyeForm
        rallye={baseRallye}
        onCancel={onCancel}
        departmentOptions={[]}
        assignedDepartmentIds={[]}
        departmentAssignmentsLoaded={true}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Zurücksetzen' }));
    expect(screen.getByText('Rallye zurücksetzen')).toBeInTheDocument();
    expect(
      screen.getByText('Soll die Rallye „Test Rallye“ wirklich zurückgesetzt werden?')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Zurücksetzen' }));

    await waitFor(() => {
      expect(mockResetRallye).toHaveBeenCalledWith('1');
    });
    await waitFor(() => {
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });
});
