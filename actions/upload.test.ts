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

  it('derives file extension from content type', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const upload = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({ upload }));
    mockCreateClient.mockResolvedValue({ storage: { from } });

    const { uploadImage } = await import('./upload');
    const result = await uploadImage('data:image/png;base64,AAAA', 'photo.jpg');

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error('Expected upload to succeed');
    }
    expect(result.data?.fileName).toMatch(/\.png$/);
    expect(from).toHaveBeenCalledWith('question-pictures');
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

  it('rejects paths with invalid characters without touching Supabase', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const { deleteImage } = await import('./upload');
    const result = await deleteImage('foo/bar.png');

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('Expected validation to fail');
    }
    expect(result.error).toBe('Ungültiger Dateipfad');
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('accepts UUID-based bucket paths', async () => {
    mockRequireProfile.mockResolvedValue({ user_id: 'staff' });

    const remove = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({ remove }));
    mockCreateClient.mockResolvedValue({ storage: { from } });

    const { deleteImage } = await import('./upload');
    const result = await deleteImage(
      '123e4567-e89b-12d3-a456-426614174000.png'
    );

    expect(result.success).toBe(true);
    expect(from).toHaveBeenCalledWith('question-pictures');
    expect(remove).toHaveBeenCalledWith([
      '123e4567-e89b-12d3-a456-426614174000.png',
    ]);
  });
});
