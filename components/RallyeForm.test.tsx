import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RallyeForm from './RallyeForm';

const { mockUpdateRallye, mockDeleteRallye } = vi.hoisted(() => ({
  mockUpdateRallye: vi.fn(),
  mockDeleteRallye: vi.fn(),
}));

vi.mock('@/actions/rallye', () => ({
  updateRallye: mockUpdateRallye,
  deleteRallye: mockDeleteRallye,
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
});
