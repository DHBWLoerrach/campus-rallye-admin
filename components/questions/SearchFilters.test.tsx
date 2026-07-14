import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SearchFilters from './SearchFilters';

describe('SearchFilters', () => {
  it('uses one search field for task and answer text', () => {
    const onFilterChange = vi.fn();

    render(<SearchFilters onFilterChange={onFilterChange} categories={[]} />);

    const search = screen.getByRole('searchbox', {
      name: 'Frage oder Lösungsoption suchen',
    });
    expect(screen.getAllByRole('searchbox')).toHaveLength(1);

    fireEvent.change(search, { target: { value: 'Mensa' } });

    expect(onFilterChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'Mensa' })
    );
    expect(onFilterChange.mock.calls.at(-1)?.[0]).not.toHaveProperty(
      'question'
    );
    expect(onFilterChange.mock.calls.at(-1)?.[0]).not.toHaveProperty('answer');
  });

  it('does not show an active search filter for whitespace', () => {
    render(<SearchFilters onFilterChange={vi.fn()} categories={[]} />);

    fireEvent.change(
      screen.getByRole('searchbox', {
        name: 'Frage oder Lösungsoption suchen',
      }),
      { target: { value: '   ' } }
    );

    expect(
      screen.queryByRole('region', { name: 'Aktive Filter' })
    ).not.toBeInTheDocument();
  });

  it('shows active filters and lets users remove them', () => {
    const onFilterChange = vi.fn();

    render(
      <SearchFilters onFilterChange={onFilterChange} categories={['Campus']} />
    );

    const typeTrigger = screen.getByRole('combobox', {
      name: 'Fragetyp',
    });
    fireEvent.click(typeTrigger);

    // Base UI Select commits on a full pointer tap of the option, not a bare
    // click (the way Radix did).
    const option = screen.getByRole('option', { name: 'Antwort auswählen' });
    fireEvent.pointerDown(option, { button: 0, pointerId: 1 });
    fireEvent.mouseDown(option, { button: 0 });
    fireEvent.pointerUp(option, { button: 0, pointerId: 1 });
    fireEvent.mouseUp(option, { button: 0 });
    fireEvent.click(option, { button: 0 });

    const activeFilters = screen.getByRole('region', {
      name: 'Aktive Filter',
    });
    expect(activeFilters).toHaveTextContent('Antwort auswählen');

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Filter „Antwort auswählen“ entfernen',
      })
    );

    expect(onFilterChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'all' })
    );
    expect(
      screen.queryByRole('region', { name: 'Aktive Filter' })
    ).not.toBeInTheDocument();
  });

  it('passes rallyeId when a rallye is selected', () => {
    const onFilterChange = vi.fn();

    render(
      <SearchFilters
        onFilterChange={onFilterChange}
        categories={[]}
        rallyes={[{ id: 1, name: 'Rallye A' }]}
      />
    );

    const rallyeTrigger = screen.getByRole('combobox', { name: 'Rallye' });
    fireEvent.click(rallyeTrigger);

    // Base UI Select commits on a full pointer tap of the option, not a bare
    // click (the way Radix did).
    const option = screen.getByRole('option', { name: 'Rallye A' });
    fireEvent.pointerDown(option, { button: 0, pointerId: 1 });
    fireEvent.mouseDown(option, { button: 0 });
    fireEvent.pointerUp(option, { button: 0, pointerId: 1 });
    fireEvent.mouseUp(option, { button: 0 });
    fireEvent.click(option, { button: 0 });

    expect(onFilterChange).toHaveBeenCalled();
    const lastCall = onFilterChange.mock.calls.at(-1)?.[0];
    expect(lastCall?.rallyeId).toBe('1');
  });

  it('offers geocaching as a target-finding filter', () => {
    render(<SearchFilters onFilterChange={vi.fn()} categories={[]} />);

    fireEvent.click(screen.getByRole('combobox', { name: 'Fragetyp' }));

    expect(
      screen.getByRole('option', { name: 'Zielort finden' })
    ).toBeInTheDocument();
  });
});
