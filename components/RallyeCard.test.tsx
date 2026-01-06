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
        uploadQuestionCount={1}
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
    expect(
      screen.queryByRole('link', { name: 'Endstand anzeigen' })
    ).not.toBeInTheDocument();
  });

  it('hides the upload photos link when no upload questions exist', () => {
    render(
      <RallyeCard
        rallye={{
          id: 7,
          name: 'Rallye 7',
          status: 'running',
          end_time: '2024-01-01',
          studiengang: 'Test',
          password: '',
          created_at: '2024-01-01',
        }}
        questionCount={0}
        uploadQuestionCount={0}
        onEdit={vi.fn()}
      />
    );

    expect(
      screen.queryByRole('link', { name: 'Upload-Fotos anzeigen' })
    ).not.toBeInTheDocument();
  });

  it('shows the results link when the rallye is ended', () => {
    render(
      <RallyeCard
        rallye={{
          id: 5,
          name: 'Rallye 5',
          status: 'ended',
          end_time: '2024-01-01',
          studiengang: 'Test',
          password: '',
          created_at: '2024-01-01',
        }}
        questionCount={0}
        uploadQuestionCount={0}
        onEdit={vi.fn()}
      />
    );

    expect(
      screen.getByRole('link', { name: 'Endstand anzeigen' })
    ).toHaveAttribute('href', '/rallyes/5/results');
  });
});
