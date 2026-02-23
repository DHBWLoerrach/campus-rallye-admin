import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRequireAdmin, mockCreateClient, mockRevalidatePath } = vi.hoisted(
  () => ({
    mockRequireAdmin: vi.fn(),
    mockCreateClient: vi.fn(),
    mockRevalidatePath: vi.fn(),
  })
);

vi.mock('@/lib/require-profile', () => ({
  requireAdmin: mockRequireAdmin,
}));

vi.mock('@/lib/supabase', () => ({
  default: mockCreateClient,
}));

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}));

const makeFormData = (entries: Record<string, string>) => {
  const formData = new FormData();
  Object.entries(entries).forEach(([key, value]) => {
    formData.set(key, value);
  });
  return formData;
};

describe('createOrganization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns validation errors before touching Supabase', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });

    const { createOrganization } = await import('./organization');
    const result = await createOrganization(null, makeFormData({ name: '' }));

    expect(result?.success).toBe(false);
    if (result?.success !== false) throw new Error('Expected failure');
    expect(result.error).toBe('Ungültige Eingaben');
    expect(result.issues?.name).toBe('Name ist erforderlich');
  });

  it('requires admin before touching Supabase', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Denied'));

    const { createOrganization } = await import('./organization');

    await expect(
      createOrganization(null, makeFormData({ name: 'Test Org' }))
    ).rejects.toThrow('Denied');

    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('treats "none" default_rallye_id as null', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });
    const single = vi.fn().mockResolvedValue({ data: { id: 1 }, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const from = vi.fn(() => ({ insert }));
    mockCreateClient.mockResolvedValue({ from });

    const { createOrganization } = await import('./organization');
    await createOrganization(
      null,
      makeFormData({ name: 'Test', default_rallye_id: 'none' })
    );

    expect(insert).toHaveBeenCalledWith({
      name: 'Test',
      default_rallye_id: null,
    });
  });
});

describe('updateOrganization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns validation errors before touching Supabase', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });

    const { updateOrganization } = await import('./organization');
    const result = await updateOrganization(
      null,
      makeFormData({ id: '1', name: '' })
    );

    expect(result?.success).toBe(false);
    if (result?.success !== false) throw new Error('Expected failure');
    expect(result.error).toBe('Ungültige Eingaben');
  });

  it('returns error when organization not found', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const selectEq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq: selectEq }));
    const from = vi.fn(() => ({ select }));
    mockCreateClient.mockResolvedValue({ from });

    const { updateOrganization } = await import('./organization');
    const result = await updateOrganization(
      null,
      makeFormData({ id: '999', name: 'Test' })
    );

    expect(result?.success).toBe(false);
    if (result?.success !== false) throw new Error('Expected failure');
    expect(result.error).toBe('Organisation nicht gefunden');
  });
});

describe('deleteOrganization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns error for invalid id', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });

    const { deleteOrganization } = await import('./organization');
    const result = await deleteOrganization('abc');

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected failure');
    expect(result.error).toBe('Ungültige Organisations-ID');
  });

  it('returns error when organization not found', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const selectEq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq: selectEq }));
    const from = vi.fn(() => ({ select }));
    mockCreateClient.mockResolvedValue({ from });

    const { deleteOrganization } = await import('./organization');
    const result = await deleteOrganization('999');

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected failure');
    expect(result.error).toBe('Organisation nicht gefunden');
  });
});

describe('getRallyeOptionsByOrganization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('requires admin', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Denied'));

    const { getRallyeOptionsByOrganization } = await import('./organization');

    await expect(getRallyeOptionsByOrganization(1)).rejects.toThrow('Denied');
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

    const { getRallyeOptionsByOrganization } = await import('./organization');
    const result = await getRallyeOptionsByOrganization(1);

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected failure');
    expect(result.error).toBe('Fehler beim Laden der Rallye-Optionen');
  });

  it('deduplicates and sorts rallye options', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });

    // Simulate two departments, each with overlapping rallye assignments
    const data = [
      {
        join_department_rallye: [
          { rallye: { id: 2, name: 'Zebra Tour' } },
          { rallye: { id: 1, name: 'Alpha Tour' } },
        ],
      },
      {
        join_department_rallye: [
          { rallye: { id: 1, name: 'Alpha Tour' } }, // duplicate
          { rallye: { id: 3, name: 'Beta Tour' } },
        ],
      },
    ];

    const eq = vi.fn().mockResolvedValue({ data, error: null });
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    mockCreateClient.mockResolvedValue({ from });

    const { getRallyeOptionsByOrganization } = await import('./organization');
    const result = await getRallyeOptionsByOrganization(5);

    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Expected success');
    // Should be deduplicated (3 unique) and sorted alphabetically
    expect(result.data).toEqual([
      { id: 1, name: 'Alpha Tour' },
      { id: 3, name: 'Beta Tour' },
      { id: 2, name: 'Zebra Tour' },
    ]);
  });

  it('returns empty array when no departments have rallyes', async () => {
    mockRequireAdmin.mockResolvedValue({ user_id: 'staff' });

    const data = [
      { join_department_rallye: [] },
      { join_department_rallye: [] },
    ];

    const eq = vi.fn().mockResolvedValue({ data, error: null });
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    mockCreateClient.mockResolvedValue({ from });

    const { getRallyeOptionsByOrganization } = await import('./organization');
    const result = await getRallyeOptionsByOrganization(5);

    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Expected success');
    expect(result.data).toEqual([]);
  });
});
