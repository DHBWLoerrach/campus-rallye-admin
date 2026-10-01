import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import QuestionQRCode from './QuestionQRCode';
import RallyeQrPrint from '@/components/rallyes/RallyeQrPrint';
import { getQrPrintQuestions } from '@/lib/qr-print-questions';

let shouldThrow = false;

vi.mock('qrcode.react', () => ({
  QRCodeSVG: (props: Record<string, unknown>) => (
    <svg data-testid="printed-qr" data-value={props.value as string} />
  ),
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
  it('shows generate button disabled when the first solution is empty', () => {
    render(<QuestionQRCode solutionOptions={[{ text: '' }]} />);
    const btn = screen.getByRole('button', { name: /qr-code generieren/i });
    expect(btn).toBeDisabled();
  });

  it('shows generate button enabled when the first solution has content', () => {
    render(
      <QuestionQRCode solutionOptions={[{ text: 'https://example.com' }]} />
    );
    const btn = screen.getByRole('button', { name: /qr-code generieren/i });
    expect(btn).not.toBeDisabled();
  });

  it('shows preview and download button after generate click', async () => {
    render(<QuestionQRCode solutionOptions={[{ text: 'test' }]} />);
    fireEvent.click(
      screen.getByRole('button', { name: /qr-code generieren/i })
    );
    expect(
      await screen.findByRole('button', { name: /png herunterladen/i })
    ).toBeInTheDocument();
  });

  it('resets preview when the QR value changes', async () => {
    const { rerender } = render(
      <QuestionQRCode solutionOptions={[{ text: 'test' }]} />
    );
    fireEvent.click(
      screen.getByRole('button', { name: /qr-code generieren/i })
    );
    expect(
      await screen.findByRole('button', { name: /png herunterladen/i })
    ).toBeInTheDocument();
    rerender(<QuestionQRCode solutionOptions={[{ text: 'other' }]} />);
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /png herunterladen/i })
      ).not.toBeInTheDocument();
    });
  });

  it.each(['qr_code', 'geocaching'])(
    'encodes the same first solution in PNG and print preview for %s',
    (type) => {
      const solutionOptions = [
        { text: '  erste Lösung  ' },
        { text: 'zweite Lösung' },
      ];
      const printedQuestions = getQrPrintQuestions([
        {
          questions: {
            id: 42,
            content: 'Station',
            type,
            geocaching_questions: { input_type: 'qr' },
            solution_options: solutionOptions,
          },
        },
      ]);
      render(
        <>
          <QuestionQRCode solutionOptions={solutionOptions} />
          <RallyeQrPrint
            rallyeId={5}
            rallyeName="Rallye"
            questions={printedQuestions}
          />
        </>
      );
      fireEvent.click(
        screen.getByRole('button', { name: /qr-code generieren/i })
      );
      for (const canvas of screen.getAllByTestId('qr-canvas')) {
        expect(canvas).toHaveAttribute('data-value', 'erste Lösung');
        expect(canvas.getAttribute('data-value')).toBe(
          screen.getByTestId('printed-qr').getAttribute('data-value')
        );
      }
      expect(screen.getByRole('button', { name: 'Drucken' })).toBeEnabled();
      expect(
        screen.getByRole('button', { name: /png herunterladen/i })
      ).toBeInTheDocument();
    }
  );

  describe('download', () => {
    it('creates a link with correct href and filename from questionContent', async () => {
      const toDataURL = vi.fn().mockReturnValue('data:image/png;base64,abc');
      vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(
        toDataURL
      );

      let downloadAttr = '';
      let hrefAttr = '';
      const clickSpy = vi.fn();
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') {
          const anchor = {
            set href(v: string) {
              hrefAttr = v;
            },
            get href() {
              return hrefAttr;
            },
            set download(v: string) {
              downloadAttr = v;
            },
            get download() {
              return downloadAttr;
            },
            click: clickSpy,
          } as unknown as HTMLElement;
          return anchor;
        }
        return document.createElementNS('http://www.w3.org/1999/xhtml', tag);
      });

      render(
        <QuestionQRCode
          solutionOptions={[{ text: 'test' }]}
          questionContent="Campus Bibliothek Eingang"
        />
      );
      fireEvent.click(
        screen.getByRole('button', { name: /qr-code generieren/i })
      );
      await screen.findByRole('button', { name: /png herunterladen/i });
      fireEvent.click(
        screen.getByRole('button', { name: /png herunterladen/i })
      );

      expect(toDataURL).toHaveBeenCalledWith('image/png');
      expect(hrefAttr).toBe('data:image/png;base64,abc');
      expect(downloadAttr).toBe('campus-bibliothek-eingang.png');
      expect(clickSpy).toHaveBeenCalled();
    });

    it('uses questionId as filename fallback', async () => {
      vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
        'data:image/png;base64,abc'
      );

      let downloadAttr = '';
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') {
          const anchor = {
            href: '',
            set download(v: string) {
              downloadAttr = v;
            },
            get download() {
              return downloadAttr;
            },
            click: vi.fn(),
          } as unknown as HTMLElement;
          return anchor;
        }
        return document.createElementNS('http://www.w3.org/1999/xhtml', tag);
      });

      render(
        <QuestionQRCode solutionOptions={[{ text: 'test' }]} questionId={42} />
      );
      fireEvent.click(
        screen.getByRole('button', { name: /qr-code generieren/i })
      );
      await screen.findByRole('button', { name: /png herunterladen/i });
      fireEvent.click(
        screen.getByRole('button', { name: /png herunterladen/i })
      );

      expect(downloadAttr).toBe('qr-code-42.png');
    });

    it('uses timestamp as filename when no questionContent or questionId', async () => {
      vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
        'data:image/png;base64,abc'
      );

      let downloadAttr = '';
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'a') {
          const anchor = {
            href: '',
            set download(v: string) {
              downloadAttr = v;
            },
            get download() {
              return downloadAttr;
            },
            click: vi.fn(),
          } as unknown as HTMLElement;
          return anchor;
        }
        return document.createElementNS('http://www.w3.org/1999/xhtml', tag);
      });

      render(<QuestionQRCode solutionOptions={[{ text: 'test' }]} />);
      fireEvent.click(
        screen.getByRole('button', { name: /qr-code generieren/i })
      );
      await screen.findByRole('button', { name: /png herunterladen/i });
      fireEvent.click(
        screen.getByRole('button', { name: /png herunterladen/i })
      );

      expect(downloadAttr).toMatch(/^qr-code-\d+\.png$/);
    });
  });

  describe('error boundary', () => {
    it('shows error message when QRCodeCanvas throws during render', async () => {
      const logError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { rerender } = render(
        <QuestionQRCode solutionOptions={[{ text: 'test' }]} />
      );
      fireEvent.click(
        screen.getByRole('button', { name: /qr-code generieren/i })
      );
      await screen.findByRole('button', { name: /png herunterladen/i });

      // Make QRCodeCanvas throw, then change text to remount via key
      shouldThrow = true;
      rerender(
        <QuestionQRCode solutionOptions={[{ text: 'trigger-error' }]} />
      );
      fireEvent.click(
        screen.getByRole('button', { name: /qr-code generieren/i })
      );

      await waitFor(() => {
        expect(
          screen.getByText(/text zu lang für qr-code/i)
        ).toBeInTheDocument();
      });
      expect(logError).toHaveBeenCalledWith(
        'QR code rendering failed:',
        expect.objectContaining({ message: 'QR capacity exceeded' }),
        expect.objectContaining({ componentStack: expect.any(String) })
      );
    });
  });
});
