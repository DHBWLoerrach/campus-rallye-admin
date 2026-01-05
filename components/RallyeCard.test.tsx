import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RallyeCard from './RallyeCard';

const { push } = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

describe('RallyeCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('links to the rallye upload photos page', () => {
    render(
      <RallyeCard
        rallye={{
          id: 12,
          name: 'Rallye 12',
          status: 'running',
          end_time: '2024-01-01',
          studiengang: 'Test',
          password: '',
          created_at: '2024-01-01',
        }}
        questionCount={0}
        onEdit={vi.fn()}
      />
    );

    expect(screen.getByRole('link', { name: 'Fragen zuordnen' })).toHaveAttribute(
      'href',
      '/rallyes/12/questions'
    );
    expect(
      screen.getByRole('link', { name: 'Upload-Fotos anzeigen' })
    ).toHaveAttribute('href', '/rallyes/12/uploads');
  });
});
