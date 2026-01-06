import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RallyeResultRank from './RallyeResultRank';

describe('RallyeResultRank', () => {
  it('renders medal emojis for top three ranks', () => {
    render(<RallyeResultRank rank={1} />);
    expect(
      screen.getByRole('img', { name: 'Goldmedaille, Platz 1' })
    ).toBeInTheDocument();
  });

  it('renders numeric rank for lower places', () => {
    render(<RallyeResultRank rank={4} />);
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});
