import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRequireProfile, mockCreateClient } = vi.hoisted(() => ({
  mockRequireProfile: vi.fn(),
  mockCreateClient: vi.fn(),
}));

vi.mock('@/lib/require-profile', () => ({
  requireProfile: mockRequireProfile,
}));

vi.mock('@/lib/supabase', () => ({
  default: mockCreateClient,
}));

describe('uploadImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('rejects invalid base64 without touching Supabase', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const { uploadImage } = await import('./upload');
    const result = await uploadImage('not-base64', 'file.png');

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected validation to fail');
    }
    expect(result.error).toBe('Ungültige Datei');
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});

describe('deleteImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('rejects empty bucket path without touching Supabase', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const { deleteImage } = await import('./upload');
    const result = await deleteImage('');

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected validation to fail');
    }
    expect(result.error).toBe('Ungültiger Dateipfad');
    expect(mockCreateClient).not.toHaveBeenCalled();
  });
});
