import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';
import RallyeDialog from './RallyeDialog';

const { mockCreateRallye } = vi.hoisted(() => ({
  mockCreateRallye: vi.fn(),
}));

vi.mock('@/actions/rallye', () => ({
  createRallye: mockCreateRallye,
}));

describe('RallyeDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an assignment CTA after creating a rallye', async () => {
    mockCreateRallye.mockResolvedValue({
      success: true,
      data: { message: 'Rallye erfolgreich gespeichert', rallyeId: 42 },
    });

    render(<RallyeDialog buttonStyle="" />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Rallye erstellen' })
    );
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Test Rallye' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: 'Fragen zuordnen' })
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole('link', { name: 'Fragen zuordnen' })
    ).toHaveAttribute('href', '/rallyes/42/questions');
  });
});
