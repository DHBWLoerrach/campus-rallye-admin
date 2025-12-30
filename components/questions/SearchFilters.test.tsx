import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SearchFilters from './SearchFilters';

describe('SearchFilters', () => {
  it('passes rallyeId when a rallye is selected', () => {
    const onFilterChange = vi.fn();

    render(
      <SearchFilters
        onFilterChange={onFilterChange}
        categories={[]}
        rallyes={[{ id: 1, name: 'Rallye A' }]}
        showAssignedToggle={false}
      />
    );

    const rallyeTrigger = screen.getByRole('combobox', { name: 'Rallye' });
    fireEvent.keyDown(rallyeTrigger, { key: 'ArrowDown' });
    fireEvent.click(screen.getByText('Rallye A'));

    expect(onFilterChange).toHaveBeenCalled();
    const lastCall = onFilterChange.mock.calls.at(-1)?.[0];
    expect(lastCall?.rallyeId).toBe('1');
  });
});
