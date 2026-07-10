import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RallyeCard from './RallyeCard';

const baseRallye = {
  id: 12,
  name: 'Studieninfotag',
  status: 'running' as const,
  end_time: '13:15:00',
  password: '',
  created_at: '2026-01-01T00:00:00.000Z',
};

describe('RallyeCard', () => {
  it('links the whole card to the detail page', () => {
    render(<RallyeCard rallye={baseRallye} questionCount={3} />);
    expect(
      screen.getByRole('link', { name: /Studieninfotag/ })
    ).toHaveAttribute('href', '/rallyes/12');
  });

  it('shows phase label, question count and context label', () => {
    render(
      <RallyeCard
        rallye={baseRallye}
        questionCount={3}
        contextLabel="Bereich: HoKo/Marketing"
      />
    );
    expect(screen.getByText('Läuft')).toBeInTheDocument();
    expect(screen.getByText('3 Fragen')).toBeInTheDocument();
    expect(screen.getByText('Bereich: HoKo/Marketing')).toBeInTheDocument();
  });

  it('frames the end time as a relaxed "geplant bis" orientation', () => {
    render(<RallyeCard rallye={baseRallye} questionCount={3} />);
    expect(screen.getByText('Geplant bis')).toBeInTheDocument();
  });

  it('shows a hint when no questions are assigned', () => {
    render(<RallyeCard rallye={baseRallye} questionCount={0} />);
    expect(screen.getByText('Keine Fragen')).toBeInTheDocument();
  });

  it('renders no action links inside the card', () => {
    render(<RallyeCard rallye={baseRallye} questionCount={3} />);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(
      screen.queryByRole('link', { name: 'Fragen zuordnen' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Einstellungen' })
    ).not.toBeInTheDocument();
  });
});
