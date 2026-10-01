import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RallyeQrPrint from './RallyeQrPrint';

const question = (id: number) => ({
  id,
  content: `Station ${id}`,
  value: `secret-${id}`,
});
const props = { rallyeId: 5, rallyeName: 'Campus-Rallye' };

describe('RallyeQrPrint', () => {
  it.each([1, 8, 9, 16, 17])(
    'prints all %i codes with at most eight on each page',
    (count) => {
      render(
        <RallyeQrPrint
          {...props}
          questions={Array.from({ length: count }, (_, i) => question(i + 1))}
        />
      );
      const pages = screen.getAllByRole('region', { name: /Druckseite/ });
      expect(pages).toHaveLength(Math.ceil(count / 8));
      pages.forEach((page, index) => {
        expect(within(page).getAllByRole('article')).toHaveLength(
          Math.min(8, count - index * 8)
        );
      });
      expect(screen.getAllByTitle(/QR-Code für Frage/)).toHaveLength(count);
      expect(screen.queryByText('secret-1')).not.toBeInTheDocument();
      const print = vi.spyOn(window, 'print').mockImplementation(() => {});
      fireEvent.click(screen.getByRole('button', { name: 'Drucken' }));
      expect(print).toHaveBeenCalledOnce();
      print.mockRestore();
    }
  );

  it('explains when no QR questions are assigned', () => {
    render(<RallyeQrPrint {...props} questions={[]} />);
    expect(screen.getByText(/keine QR-Code-Fragen/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Drucken' })
    ).not.toBeInTheDocument();
  });

  it('identifies missing solutions and prevents incomplete printing', () => {
    render(
      <RallyeQrPrint {...props} questions={[{ ...question(1), value: '' }]} />
    );
    expect(screen.getByText(/Frage #1/)).toBeInTheDocument();
    expect(screen.getByText(/Keine ausgefüllte erste/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Drucken' })).toBeDisabled();
  });

  it('identifies values exceeding QR capacity and prevents printing', () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    try {
      render(
        <RallyeQrPrint
          {...props}
          questions={[{ ...question(1), value: 'x'.repeat(10000) }]}
        />
      );
      expect(
        screen.getByText(/QR-Code konnte nicht erzeugt/)
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Drucken' })).toBeDisabled();
    } finally {
      consoleError.mockRestore();
    }
  });
});
