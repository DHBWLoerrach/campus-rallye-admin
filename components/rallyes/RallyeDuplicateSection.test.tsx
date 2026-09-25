import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RallyeDuplicateSection from './RallyeDuplicateSection';

const { mockDuplicate, mockPush } = vi.hoisted(() => ({
  mockDuplicate: vi.fn(),
  mockPush: vi.fn(),
}));

vi.mock('@/actions/rallye', () => ({
  duplicateRallye: mockDuplicate,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('RallyeDuplicateSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens the copy after duplicating', async () => {
    mockDuplicate.mockResolvedValue({
      success: true,
      data: { rallyeId: 99, message: 'ok' },
    });
    render(<RallyeDuplicateSection rallyeId={5} />);

    fireEvent.click(screen.getByRole('button', { name: 'Duplizieren' }));

    await waitFor(() => expect(mockDuplicate).toHaveBeenCalledWith(5));
    expect(mockPush).toHaveBeenCalledWith('/rallyes/99');
  });

  it('shows the error when duplication fails', async () => {
    mockDuplicate.mockResolvedValue({ success: false, error: 'Kaputt' });
    render(<RallyeDuplicateSection rallyeId={5} />);

    fireEvent.click(screen.getByRole('button', { name: 'Duplizieren' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Kaputt');
    expect(mockPush).not.toHaveBeenCalled();
  });
});
