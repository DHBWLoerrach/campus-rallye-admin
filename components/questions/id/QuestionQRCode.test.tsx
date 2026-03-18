import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import QuestionQRCode from './QuestionQRCode';

vi.mock('qrcode.react', () => ({
  QRCodeCanvas: (props: Record<string, unknown>) => (
    <canvas data-testid="qr-canvas" data-value={props.value as string} />
  ),
}));

describe('QuestionQRCode', () => {
  it('shows generate button disabled when answerText is empty', () => {
    render(<QuestionQRCode answerText="" />);
    const btn = screen.getByRole('button', { name: /qr-code generieren/i });
    expect(btn).toBeDisabled();
  });

  it('shows generate button enabled when answerText has content', () => {
    render(<QuestionQRCode answerText="https://example.com" />);
    const btn = screen.getByRole('button', { name: /qr-code generieren/i });
    expect(btn).not.toBeDisabled();
  });

  it('shows preview and download button after generate click', async () => {
    render(<QuestionQRCode answerText="test" />);
    fireEvent.click(screen.getByRole('button', { name: /qr-code generieren/i }));
    expect(await screen.findByRole('button', { name: /png herunterladen/i })).toBeInTheDocument();
  });

  it('resets preview when answerText changes', async () => {
    const { rerender } = render(<QuestionQRCode answerText="test" />);
    fireEvent.click(screen.getByRole('button', { name: /qr-code generieren/i }));
    expect(await screen.findByRole('button', { name: /png herunterladen/i })).toBeInTheDocument();
    rerender(<QuestionQRCode answerText="other" />);
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /png herunterladen/i })).not.toBeInTheDocument();
    });
  });
});
