import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import QuestionQRCode from './QuestionQRCode';

let shouldThrow = false;

vi.mock('qrcode.react', () => ({
  QRCodeCanvas: (props: Record<string, unknown>) => {
    if (shouldThrow) throw new Error('QR capacity exceeded');
    return (
      <canvas data-testid="qr-canvas" data-value={props.value as string} />
    );
  },
}));

beforeEach(() => {
  shouldThrow = false;
});

afterEach(() => {
  vi.restoreAllMocks();
});

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

  describe('download', () => {
    it('creates a link with correct href and filename from questionContent', async () => {
      const toDataURL = vi.fn().mockReturnValue('data:image/png;base64,abc');
      vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(toDataURL);

      let downloadAttr = '';
      let hrefAttr = '';
      const clickSpy = vi.fn();
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') {
          const anchor = {
            set href(v: string) { hrefAttr = v; },
            get href() { return hrefAttr; },
            set download(v: string) { downloadAttr = v; },
            get download() { return downloadAttr; },
            click: clickSpy,
          } as unknown as HTMLElement;
          return anchor;
        }
        return document.createElementNS('http://www.w3.org/1999/xhtml', tag);
      });

      render(<QuestionQRCode answerText="test" questionContent="Campus Bibliothek Eingang" />);
      fireEvent.click(screen.getByRole('button', { name: /qr-code generieren/i }));
      await screen.findByRole('button', { name: /png herunterladen/i });
      fireEvent.click(screen.getByRole('button', { name: /png herunterladen/i }));

      expect(toDataURL).toHaveBeenCalledWith('image/png');
      expect(hrefAttr).toBe('data:image/png;base64,abc');
      expect(downloadAttr).toBe('campus-bibliothek-eingang.png');
      expect(clickSpy).toHaveBeenCalled();
    });

    it('uses questionId as filename fallback', async () => {
      vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,abc');

      let downloadAttr = '';
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') {
          const anchor = {
            href: '',
            set download(v: string) { downloadAttr = v; },
            get download() { return downloadAttr; },
            click: vi.fn(),
          } as unknown as HTMLElement;
          return anchor;
        }
        return document.createElementNS('http://www.w3.org/1999/xhtml', tag);
      });

      render(<QuestionQRCode answerText="test" questionId={42} />);
      fireEvent.click(screen.getByRole('button', { name: /qr-code generieren/i }));
      await screen.findByRole('button', { name: /png herunterladen/i });
      fireEvent.click(screen.getByRole('button', { name: /png herunterladen/i }));

      expect(downloadAttr).toBe('qr-code-42.png');
    });

    it('uses timestamp as filename when no questionContent or questionId', async () => {
      vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,abc');

      let downloadAttr = '';
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') {
          const anchor = {
            href: '',
            set download(v: string) { downloadAttr = v; },
            get download() { return downloadAttr; },
            click: vi.fn(),
          } as unknown as HTMLElement;
          return anchor;
        }
        return document.createElementNS('http://www.w3.org/1999/xhtml', tag);
      });

      render(<QuestionQRCode answerText="test" />);
      fireEvent.click(screen.getByRole('button', { name: /qr-code generieren/i }));
      await screen.findByRole('button', { name: /png herunterladen/i });
      fireEvent.click(screen.getByRole('button', { name: /png herunterladen/i }));

      expect(downloadAttr).toMatch(/^qr-code-\d+\.png$/);
    });
  });

  describe('error boundary', () => {
    it('shows error message when QRCodeCanvas throws during render', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const { rerender } = render(<QuestionQRCode answerText="test" />);
      fireEvent.click(screen.getByRole('button', { name: /qr-code generieren/i }));
      await screen.findByRole('button', { name: /png herunterladen/i });

      // Make QRCodeCanvas throw, then change text to remount via key
      shouldThrow = true;
      rerender(<QuestionQRCode answerText="trigger-error" />);
      fireEvent.click(screen.getByRole('button', { name: /qr-code generieren/i }));

      await waitFor(() => {
        expect(screen.getByText(/text zu lang für qr-code/i)).toBeInTheDocument();
      });
    });
  });
});
