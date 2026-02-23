import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRequireProfile, mockCreateClient, mockRevalidatePath } = vi.hoisted(
  () => ({
    mockRequireProfile: vi.fn(),
    mockCreateClient: vi.fn(),
    mockRevalidatePath: vi.fn(),
  })
);

vi.mock('@/lib/require-profile', () => ({
  requireProfile: mockRequireProfile,
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
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const { createDepartment } = await import('./department');
    const result = await createDepartment(null, makeFormData({ name: '' }));

    expect(result?.success).toBe(false);
    if (result?.success !== false) throw new Error('Expected failure');
    expect(result.error).toBe('Ungültige Eingaben');
    expect(result.issues?.name).toBe('Name ist erforderlich');
  });

  it('requires a profile before touching Supabase', async () => {
    mockRequireProfile.mockRejectedValue(new Error('Denied'));

    const { createDepartment } = await import('./department');

    await expect(
      createDepartment(
        null,
        makeFormData({ name: 'IT', organization_id: '1' })
      )
    ).rejects.toThrow('Denied');

    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('returns error when organization not found', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: null });
    const selectEq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq: selectEq }));
    const from = vi.fn(() => ({ select }));
    mockCreateClient.mockResolvedValue({ from });

    const { createDepartment } = await import('./department');
    const result = await createDepartment(
      null,
      makeFormData({ name: 'IT', organization_id: '999' })
    );

    expect(result?.success).toBe(false);
    if (result?.success !== false) throw new Error('Expected failure');
    expect(result.error).toBe('Organisation nicht gefunden');
  });

  it('saves rallye assignments after creating department', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    // org check
    const orgMaybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: 1 }, error: null });
    const orgSelectEq = vi.fn(() => ({ maybeSingle: orgMaybeSingle }));
    const orgSelect = vi.fn(() => ({ eq: orgSelectEq }));

    // department insert
    const deptSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: 42 }, error: null });
    const deptSelect = vi.fn(() => ({ single: deptSingle }));
    const deptInsert = vi.fn(() => ({ select: deptSelect }));

    // rallye assign insert
    const joinInsert = vi
      .fn()
      .mockResolvedValue({ error: null });

    const from = vi.fn((table: string) => {
      if (table === 'organization') return { select: orgSelect };
      if (table === 'department') return { insert: deptInsert, select: orgSelect };
      if (table === 'join_department_rallye') return { insert: joinInsert };
      return {};
    });
    mockCreateClient.mockResolvedValue({ from });

    const { createDepartment } = await import('./department');
    const result = await createDepartment(
      null,
      makeFormData(
        { name: 'IT', organization_id: '1' },
        { rallye_ids: ['10', '20'] }
      )
    );

    expect(result?.success).toBe(true);
    expect(joinInsert).toHaveBeenCalledWith([
      { department_id: 42, rallye_id: 10 },
      { department_id: 42, rallye_id: 20 },
    ]);
  });

  it('skips rallye insert when no rallye_ids provided', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const orgMaybeSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: 1 }, error: null });
    const orgSelectEq = vi.fn(() => ({ maybeSingle: orgMaybeSingle }));
    const orgSelect = vi.fn(() => ({ eq: orgSelectEq }));

    const deptSingle = vi
      .fn()
      .mockResolvedValue({ data: { id: 42 }, error: null });
    const deptSelect = vi.fn(() => ({ single: deptSingle }));
    const deptInsert = vi.fn(() => ({ select: deptSelect }));

    const joinInsert = vi.fn().mockResolvedValue({ error: null });

    const from = vi.fn((table: string) => {
      if (table === 'organization') return { select: orgSelect };
      if (table === 'department') return { insert: deptInsert, select: orgSelect };
      if (table === 'join_department_rallye') return { insert: joinInsert };
      return {};
    });
    mockCreateClient.mockResolvedValue({ from });

    const { createDepartment } = await import('./department');
    const result = await createDepartment(
      null,
      makeFormData({ name: 'IT', organization_id: '1' })
    );

    expect(result?.success).toBe(true);
    expect(joinInsert).not.toHaveBeenCalled();
  });
});

describe('updateDepartment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns validation errors before touching Supabase', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

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
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: null });
    const selectEq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq: selectEq }));
    const from = vi.fn(() => ({ select }));
    mockCreateClient.mockResolvedValue({ from });

    const { updateDepartment } = await import('./department');
    const result = await updateDepartment(
      null,
      makeFormData({ id: '999', name: 'IT', organization_id: '1' })
    );

    expect(result?.success).toBe(false);
    if (result?.success !== false) throw new Error('Expected failure');
    expect(result.error).toBe('Abteilung nicht gefunden');
  });

  it('syncs rallye assignments on update with delta changes', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

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
    const joinSelectEq = vi.fn().mockResolvedValue({
      data: [{ rallye_id: 10 }, { rallye_id: 20 }],
      error: null,
    });
    const joinSelect = vi.fn(() => ({ eq: joinSelectEq }));
    const joinInsert = vi.fn().mockResolvedValue({ error: null });
    const joinDeleteIn = vi.fn().mockResolvedValue({ error: null });
    const joinDeleteEq = vi.fn(() => ({ in: joinDeleteIn }));
    const joinDelete = vi.fn(() => ({ eq: joinDeleteEq }));

    const from = vi.fn((table: string) => {
      if (table === 'department') {
        return { select: deptSelect, update };
      }
      if (table === 'organization') return { select: orgSelect };
      if (table === 'join_department_rallye') {
        return { select: joinSelect, insert: joinInsert, delete: joinDelete };
      }
      return {};
    });
    mockCreateClient.mockResolvedValue({ from });

    const { updateDepartment } = await import('./department');
    const result = await updateDepartment(
      null,
      makeFormData(
        { id: '5', name: 'IT', organization_id: '1' },
        { rallye_ids: ['20', '30'] }
      )
    );

    expect(result?.success).toBe(true);
    expect(joinSelectEq).toHaveBeenCalledWith('department_id', 5);
    expect(joinInsert).toHaveBeenCalledWith([
      { department_id: 5, rallye_id: 30 },
    ]);
    expect(joinDeleteEq).toHaveBeenCalledWith('department_id', 5);
    expect(joinDeleteIn).toHaveBeenCalledWith('rallye_id', [10]);
  });

  it('returns an error and keeps existing links when insert fails', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

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

    const joinSelectEq = vi
      .fn()
      .mockResolvedValue({ data: [{ rallye_id: 10 }], error: null });
    const joinSelect = vi.fn(() => ({ eq: joinSelectEq }));
    const joinInsert = vi
      .fn()
      .mockResolvedValue({ error: { message: 'insert failed' } });
    const joinDelete = vi.fn();

    const from = vi.fn((table: string) => {
      if (table === 'department') return { select: deptSelect, update };
      if (table === 'organization') return { select: orgSelect };
      if (table === 'join_department_rallye') {
        return { select: joinSelect, insert: joinInsert, delete: joinDelete };
      }
      return {};
    });
    mockCreateClient.mockResolvedValue({ from });

    const { updateDepartment } = await import('./department');
    const result = await updateDepartment(
      null,
      makeFormData(
        { id: '5', name: 'IT', organization_id: '1' },
        { rallye_ids: ['20'] }
      )
    );

    expect(result?.success).toBe(false);
    if (result?.success !== false) throw new Error('Expected failure');
    expect(result.error).toBe('Es ist ein Fehler aufgetreten');
    expect(joinDelete).not.toHaveBeenCalled();
  });

  it('returns an error when removing stale rallye links fails', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

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

    const joinSelectEq = vi
      .fn()
      .mockResolvedValue({ data: [{ rallye_id: 10 }], error: null });
    const joinSelect = vi.fn(() => ({ eq: joinSelectEq }));
    const joinDeleteIn = vi
      .fn()
      .mockResolvedValue({ error: { message: 'delete failed' } });
    const joinDeleteEq = vi.fn(() => ({ in: joinDeleteIn }));
    const joinDelete = vi.fn(() => ({ eq: joinDeleteEq }));

    const from = vi.fn((table: string) => {
      if (table === 'department') return { select: deptSelect, update };
      if (table === 'organization') return { select: orgSelect };
      if (table === 'join_department_rallye') {
        return { select: joinSelect, delete: joinDelete, insert: vi.fn() };
      }
      return {};
    });
    mockCreateClient.mockResolvedValue({ from });

    const { updateDepartment } = await import('./department');
    const result = await updateDepartment(
      null,
      makeFormData({ id: '5', name: 'IT', organization_id: '1' })
    );

    expect(result?.success).toBe(false);
    if (result?.success !== false) throw new Error('Expected failure');
    expect(result.error).toBe('Es ist ein Fehler aufgetreten');
    expect(joinDeleteEq).toHaveBeenCalledWith('department_id', 5);
    expect(joinDeleteIn).toHaveBeenCalledWith('rallye_id', [10]);
  });
});

describe('deleteDepartment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns error for invalid id', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const { deleteDepartment } = await import('./department');
    const result = await deleteDepartment('abc');

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected failure');
    expect(result.error).toBe('Ungültige Abteilungs-ID');
  });

  it('returns error when department not found', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: null });
    const selectEq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq: selectEq }));
    const from = vi.fn(() => ({ select }));
    mockCreateClient.mockResolvedValue({ from });

    const { deleteDepartment } = await import('./department');
    const result = await deleteDepartment('999');

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected failure');
    expect(result.error).toBe('Abteilung nicht gefunden');
  });
});

describe('getRallyeAssignmentsByDepartment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('requires a profile', async () => {
    mockRequireProfile.mockRejectedValue(new Error('Denied'));

    const { getRallyeAssignmentsByDepartment } = await import('./department');

    await expect(getRallyeAssignmentsByDepartment(1)).rejects.toThrow(
      'Denied'
    );
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('returns an error when supabase query fails', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });
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

  it('returns rallye ids from join table', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const data = [{ rallye_id: 10 }, { rallye_id: 20 }, { rallye_id: 30 }];
    const eq = vi.fn().mockResolvedValue({ data, error: null });
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    mockCreateClient.mockResolvedValue({ from });

    const { getRallyeAssignmentsByDepartment } = await import('./department');
    const result = await getRallyeAssignmentsByDepartment(5);

    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Expected success');
    expect(result.data).toEqual([10, 20, 30]);
    expect(from).toHaveBeenCalledWith('join_department_rallye');
    expect(eq).toHaveBeenCalledWith('department_id', 5);
  });

  it('returns empty array when no assignments exist', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

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
