import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockRequireAdmin,
  mockCreateClient,
  mockRevalidatePath,
  mockClearDepartmentAssignments,
} = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockCreateClient: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockClearDepartmentAssignments: vi.fn(),
}));

vi.mock('@/lib/db/local-user', () => ({
  clearDepartmentAssignments: mockClearDepartmentAssignments,
}));

vi.mock('@/lib/require-profile', () => ({
  requireAdmin: mockRequireAdmin,
}));

vi.mock('@/lib/supabase', () => ({
  default: mockCreateClient,
}));

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}));

const makeFormData = (
  entries: Record<string, string>,
  multiEntries?: Record<string, string[]>
) => {
  const formData = new FormData();
  Object.entries(entries).forEach(([key, value]) => {
    formData.set(key, value);
  });
  if (multiEntries) {
    Object.entries(multiEntries).forEach(([key, values]) => {
      values.forEach((value) => formData.append(key, value));
    });
  }
  return formData;
};

describe('createDepartment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns validation errors before touching Supabase', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });

    const { createDepartment } = await import('./department');
    const result = await createDepartment(null, makeFormData({ name: '' }));

    expect(result?.success).toBe(false);
    if (result?.success !== false) throw new Error('Expected failure');
    expect(result.error).toBe('Ungültige Eingaben');
    expect(result.issues?.name).toBe('Name ist erforderlich');
  });

  it('requires admin before touching Supabase', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Denied'));

    const { createDepartment } = await import('./department');

    await expect(
      createDepartment(null, makeFormData({ name: 'IT', location_id: '1' }))
    ).rejects.toThrow('Denied');

    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('returns error when location not found', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const selectEq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq: selectEq }));
    const from = vi.fn(() => ({ select }));
    mockCreateClient.mockResolvedValue({ from });

    const { createDepartment } = await import('./department');
    const result = await createDepartment(
      null,
      makeFormData({ name: 'IT', location_id: '999' })
    );

    expect(result?.success).toBe(false);
    if (result?.success !== false) throw new Error('Expected failure');
    expect(result.error).toBe('Standort nicht gefunden');
  });

  it('saves rallye assignments after creating department', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });

    // location check
    const locationMaybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: 1 }, error: null });
    const locationSelectEq = vi.fn(() => ({
      maybeSingle: locationMaybeSingle,
    }));
    const locationSelect = vi.fn(() => ({ eq: locationSelectEq }));

    // department insert
    const deptSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: 42 }, error: null });
    const deptSelect = vi.fn(() => ({ single: deptSingle }));
    const deptInsert = vi.fn(() => ({ select: deptSelect }));

    // rallye assign update
    const rallyeUpdateIn = vi.fn().mockResolvedValue({ error: null });
    const rallyeUpdate = vi.fn(() => ({ in: rallyeUpdateIn }));

    const from = vi.fn((table: string) => {
      if (table === 'location') return { select: locationSelect };
      if (table === 'department')
        return { insert: deptInsert, select: locationSelect };
      if (table === 'rallyes') return { update: rallyeUpdate };
      return {};
    });
    mockCreateClient.mockResolvedValue({ from });

    const { createDepartment } = await import('./department');
    const result = await createDepartment(
      null,
      makeFormData(
        { name: 'IT', location_id: '1' },
        { rallye_ids: ['10', '20'] }
      )
    );

    expect(result?.success).toBe(true);
    expect(rallyeUpdate).toHaveBeenCalledWith({ department_id: 42 });
    expect(rallyeUpdateIn).toHaveBeenCalledWith('id', [10, 20]);
  });

  it('skips rallye insert when no rallye_ids provided', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });

    const locationMaybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: 1 }, error: null });
    const locationSelectEq = vi.fn(() => ({
      maybeSingle: locationMaybeSingle,
    }));
    const locationSelect = vi.fn(() => ({ eq: locationSelectEq }));

    const deptSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: 42 }, error: null });
    const deptSelect = vi.fn(() => ({ single: deptSingle }));
    const deptInsert = vi.fn(() => ({ select: deptSelect }));

    const rallyeUpdate = vi.fn();

    const from = vi.fn((table: string) => {
      if (table === 'location') return { select: locationSelect };
      if (table === 'department')
        return { insert: deptInsert, select: locationSelect };
      if (table === 'rallyes') return { update: rallyeUpdate };
      return {};
    });
    mockCreateClient.mockResolvedValue({ from });

    const { createDepartment } = await import('./department');
    const result = await createDepartment(
      null,
      makeFormData({ name: 'IT', location_id: '1' })
    );

    expect(result?.success).toBe(true);
    expect(rallyeUpdate).not.toHaveBeenCalled();
  });

  it('returns an error when rallye assignment update fails and rolls back department', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });

    const locationMaybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: 1 }, error: null });
    const locationSelectEq = vi.fn(() => ({
      maybeSingle: locationMaybeSingle,
    }));
    const locationSelect = vi.fn(() => ({ eq: locationSelectEq }));

    const deptSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: 42 }, error: null });
    const deptSelect = vi.fn(() => ({ single: deptSingle }));
    const deptInsert = vi.fn(() => ({ select: deptSelect }));
    const deptDeleteEq = vi.fn().mockResolvedValue({ error: null });
    const deptDelete = vi.fn(() => ({ eq: deptDeleteEq }));

    const rallyeUpdateIn = vi
      .fn()
      .mockResolvedValue({ error: { message: 'update failed' } });
    const rallyeUpdate = vi.fn(() => ({ in: rallyeUpdateIn }));

    const from = vi.fn((table: string) => {
      if (table === 'location') return { select: locationSelect };
      if (table === 'department') {
        return {
          insert: deptInsert,
          delete: deptDelete,
          select: locationSelect,
        };
      }
      if (table === 'rallyes') return { update: rallyeUpdate };
      return {};
    });
    mockCreateClient.mockResolvedValue({ from });

    const { createDepartment } = await import('./department');
    const result = await createDepartment(
      null,
      makeFormData(
        { name: 'IT', location_id: '1' },
        { rallye_ids: ['10', '20'] }
      )
    );

    expect(result?.success).toBe(false);
    if (result?.success !== false) throw new Error('Expected failure');
    expect(result.error).toBe('Es ist ein Fehler aufgetreten');
    expect(rallyeUpdateIn).toHaveBeenCalled();
    expect(deptDeleteEq).toHaveBeenCalledWith('id', 42);
  });
});

describe('updateDepartment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns validation errors before touching Supabase', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });

    const { updateDepartment } = await import('./department');
    const result = await updateDepartment(
      null,
      makeFormData({ id: '1', name: '' })
    );

    expect(result?.success).toBe(false);
    if (result?.success !== false) throw new Error('Expected failure');
    expect(result.error).toBe('Ungültige Eingaben');
  });

  it('returns error when department not found', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const selectEq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq: selectEq }));
    const from = vi.fn(() => ({ select }));
    mockCreateClient.mockResolvedValue({ from });

    const { updateDepartment } = await import('./department');
    const result = await updateDepartment(
      null,
      makeFormData({ id: '999', name: 'IT', location_id: '1' })
    );

    expect(result?.success).toBe(false);
    if (result?.success !== false) throw new Error('Expected failure');
    expect(result.error).toBe('Bereich nicht gefunden');
  });

  it('syncs rallye assignments on update with delta changes', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });

    // dept check
    const deptMaybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: 5 }, error: null });
    const deptSelectEq = vi.fn(() => ({ maybeSingle: deptMaybeSingle }));
    const deptSelect = vi.fn(() => ({ eq: deptSelectEq }));

    // org check
    const orgMaybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: 1 }, error: null });
    const orgSelectEq = vi.fn(() => ({ maybeSingle: orgMaybeSingle }));
    const orgSelect = vi.fn(() => ({ eq: orgSelectEq }));

    // dept update
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq: updateEq }));

    // load current assignments + delta sync
    const rallyeSelectEq = vi.fn().mockResolvedValue({
      data: [{ id: 10 }, { id: 20 }],
      error: null,
    });
    const rallyeSelect = vi.fn(() => ({ eq: rallyeSelectEq }));
    const rallyeAssignIn = vi.fn().mockResolvedValue({ error: null });
    const rallyeAssignUpdate = vi.fn(() => ({ in: rallyeAssignIn }));
    const rallyeUnassignIn = vi.fn().mockResolvedValue({ error: null });
    const rallyeUnassignEq = vi.fn(() => ({ in: rallyeUnassignIn }));
    const rallyeUnassignUpdate = vi.fn(() => ({ eq: rallyeUnassignEq }));

    const from = vi.fn((table: string) => {
      if (table === 'department') {
        return { select: deptSelect, update };
      }
      if (table === 'location') return { select: orgSelect };
      if (table === 'rallyes') {
        return {
          select: rallyeSelect,
          update: (payload: { department_id: number | null }) =>
            payload.department_id === null
              ? rallyeUnassignUpdate()
              : rallyeAssignUpdate(),
        };
      }
      return {};
    });
    mockCreateClient.mockResolvedValue({ from });

    const { updateDepartment } = await import('./department');
    const result = await updateDepartment(
      null,
      makeFormData(
        { id: '5', name: 'IT', location_id: '1' },
        { rallye_ids: ['20', '30'] }
      )
    );

    expect(result?.success).toBe(true);
    expect(rallyeSelectEq).toHaveBeenCalledWith('department_id', 5);
    expect(rallyeAssignIn).toHaveBeenCalledWith('id', [30]);
    expect(rallyeUnassignEq).toHaveBeenCalledWith('department_id', 5);
    expect(rallyeUnassignIn).toHaveBeenCalledWith('id', [10]);
  });

  it('returns an error and keeps existing links when insert fails', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });

    const deptMaybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: 5 }, error: null });
    const deptSelectEq = vi.fn(() => ({ maybeSingle: deptMaybeSingle }));
    const deptSelect = vi.fn(() => ({ eq: deptSelectEq }));

    const orgMaybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: 1 }, error: null });
    const orgSelectEq = vi.fn(() => ({ maybeSingle: orgMaybeSingle }));
    const orgSelect = vi.fn(() => ({ eq: orgSelectEq }));

    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq: updateEq }));

    const rallyeSelectEq = vi
      .fn()
      .mockResolvedValue({ data: [{ id: 10 }], error: null });
    const rallyeSelect = vi.fn(() => ({ eq: rallyeSelectEq }));
    const rallyeAssignIn = vi
      .fn()
      .mockResolvedValue({ error: { message: 'insert failed' } });
    const rallyeAssignUpdate = vi.fn(() => ({ in: rallyeAssignIn }));
    const rallyeUnassignUpdate = vi.fn();

    const from = vi.fn((table: string) => {
      if (table === 'department') return { select: deptSelect, update };
      if (table === 'location') return { select: orgSelect };
      if (table === 'rallyes') {
        return {
          select: rallyeSelect,
          update: (payload: { department_id: number | null }) =>
            payload.department_id === null
              ? rallyeUnassignUpdate()
              : rallyeAssignUpdate(),
        };
      }
      return {};
    });
    mockCreateClient.mockResolvedValue({ from });

    const { updateDepartment } = await import('./department');
    const result = await updateDepartment(
      null,
      makeFormData(
        { id: '5', name: 'IT', location_id: '1' },
        { rallye_ids: ['20'] }
      )
    );

    expect(result?.success).toBe(false);
    if (result?.success !== false) throw new Error('Expected failure');
    expect(result.error).toBe('Es ist ein Fehler aufgetreten');
    expect(rallyeAssignIn).toHaveBeenCalledWith('id', [20]);
    expect(rallyeUnassignUpdate).not.toHaveBeenCalled();
  });

  it('returns an error when removing stale rallye links fails', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });

    const deptMaybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: 5 }, error: null });
    const deptSelectEq = vi.fn(() => ({ maybeSingle: deptMaybeSingle }));
    const deptSelect = vi.fn(() => ({ eq: deptSelectEq }));

    const orgMaybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: 1 }, error: null });
    const orgSelectEq = vi.fn(() => ({ maybeSingle: orgMaybeSingle }));
    const orgSelect = vi.fn(() => ({ eq: orgSelectEq }));

    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq: updateEq }));

    const rallyeSelectEq = vi
      .fn()
      .mockResolvedValue({ data: [{ id: 10 }], error: null });
    const rallyeSelect = vi.fn(() => ({ eq: rallyeSelectEq }));
    const rallyeUnassignIn = vi
      .fn()
      .mockResolvedValue({ error: { message: 'delete failed' } });
    const rallyeUnassignEq = vi.fn(() => ({ in: rallyeUnassignIn }));
    const rallyeUnassignUpdate = vi.fn(() => ({ eq: rallyeUnassignEq }));
    const rallyeAssignUpdate = vi.fn();

    const from = vi.fn((table: string) => {
      if (table === 'department') return { select: deptSelect, update };
      if (table === 'location') return { select: orgSelect };
      if (table === 'rallyes') {
        return {
          select: rallyeSelect,
          update: (payload: { department_id: number | null }) =>
            payload.department_id === null
              ? rallyeUnassignUpdate()
              : rallyeAssignUpdate(),
        };
      }
      return {};
    });
    mockCreateClient.mockResolvedValue({ from });

    const { updateDepartment } = await import('./department');
    const result = await updateDepartment(
      null,
      makeFormData({ id: '5', name: 'IT', location_id: '1' })
    );

    expect(result?.success).toBe(false);
    if (result?.success !== false) throw new Error('Expected failure');
    expect(result.error).toBe('Es ist ein Fehler aufgetreten');
    expect(rallyeUnassignEq).toHaveBeenCalledWith('department_id', 5);
    expect(rallyeUnassignIn).toHaveBeenCalledWith('id', [10]);
  });
});

describe('deleteDepartment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns error for invalid id', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });

    const { deleteDepartment } = await import('./department');
    const result = await deleteDepartment('abc');

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected failure');
    expect(result.error).toBe('Ungültige Bereichs-ID');
  });

  it('returns error when department not found', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const selectEq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq: selectEq }));
    const from = vi.fn(() => ({ select }));
    mockCreateClient.mockResolvedValue({ from });

    const { deleteDepartment } = await import('./department');
    const result = await deleteDepartment('999');

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected failure');
    expect(result.error).toBe('Bereich nicht gefunden');
  });

  it('clears local user assignments after deleting the department', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });
    mockClearDepartmentAssignments.mockReturnValue(2);
    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: 7 }, error: null });
    const departmentSelectEq = vi.fn(() => ({ maybeSingle }));
    const departmentSelect = vi.fn(() => ({ eq: departmentSelectEq }));
    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    const deleteFn = vi.fn(() => ({ eq: deleteEq }));
    const rallyeSelectEq = vi.fn().mockResolvedValue({ data: [], error: null });
    const rallyeSelect = vi.fn(() => ({ eq: rallyeSelectEq }));
    const from = vi.fn((table: string) =>
      table === 'rallyes'
        ? { select: rallyeSelect }
        : { select: departmentSelect, delete: deleteFn }
    );
    mockCreateClient.mockResolvedValue({ from });

    const { deleteDepartment } = await import('./department');
    const result = await deleteDepartment('7');

    expect(result.success).toBe(true);
    expect(mockClearDepartmentAssignments).toHaveBeenCalledWith(7);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/users');
  });

  it('blocks deletion with a clear message when rallyes are still assigned', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });
    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: 7 }, error: null });
    const departmentSelectEq = vi.fn(() => ({ maybeSingle }));
    const departmentSelect = vi.fn(() => ({ eq: departmentSelectEq }));
    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    const deleteFn = vi.fn(() => ({ eq: deleteEq }));
    const rallyeSelectEq = vi
      .fn()
      .mockResolvedValue({ data: [{ id: 1 }], error: null });
    const rallyeSelect = vi.fn(() => ({ eq: rallyeSelectEq }));
    const from = vi.fn((table: string) =>
      table === 'rallyes'
        ? { select: rallyeSelect }
        : { select: departmentSelect, delete: deleteFn }
    );
    mockCreateClient.mockResolvedValue({ from });

    const { deleteDepartment } = await import('./department');
    const result = await deleteDepartment('7');

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected failure');
    expect(result.error).toContain('zugeordnete Rallyes');
    expect(deleteFn).not.toHaveBeenCalled();
    expect(mockClearDepartmentAssignments).not.toHaveBeenCalled();
  });
});

describe('getRallyeAssignmentsByDepartment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('requires admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Denied'));

    const { getRallyeAssignmentsByDepartment } = await import('./department');

    await expect(getRallyeAssignmentsByDepartment(1)).rejects.toThrow('Denied');
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('returns an error when supabase query fails', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });
    const eq = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'DB error' } });
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    mockCreateClient.mockResolvedValue({ from });

    const { getRallyeAssignmentsByDepartment } = await import('./department');
    const result = await getRallyeAssignmentsByDepartment(1);

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected failure');
    expect(result.error).toBe('Fehler beim Laden der Rallye-Zuordnungen');
  });

  it('returns rallye ids from rallye table', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });

    const data = [{ id: 10 }, { id: 20 }, { id: 30 }];
    const eq = vi.fn().mockResolvedValue({ data, error: null });
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    mockCreateClient.mockResolvedValue({ from });

    const { getRallyeAssignmentsByDepartment } = await import('./department');
    const result = await getRallyeAssignmentsByDepartment(5);

    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Expected success');
    expect(result.data).toEqual([10, 20, 30]);
    expect(from).toHaveBeenCalledWith('rallyes');
    expect(eq).toHaveBeenCalledWith('department_id', 5);
  });

  it('returns empty array when no assignments exist', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });

    const eq = vi.fn().mockResolvedValue({ data: [], error: null });
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    mockCreateClient.mockResolvedValue({ from });

    const { getRallyeAssignmentsByDepartment } = await import('./department');
    const result = await getRallyeAssignmentsByDepartment(5);

    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Expected success');
    expect(result.data).toEqual([]);
  });
});
