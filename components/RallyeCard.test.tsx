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
          password: '',
          created_at: '2024-01-01',
        }}
        questionCount={0}
        uploadQuestionCount={1}
      />
    );

    expect(
      screen.getByRole('link', { name: 'Fragen zuordnen' })
    ).toHaveAttribute('href', '/rallyes/12');
    expect(
      screen.getByRole('link', { name: 'Upload-Fotos anzeigen' })
    ).toHaveAttribute('href', '/rallyes/12/uploads');
    expect(
      screen.queryByRole('link', { name: 'Endstand anzeigen' })
    ).not.toBeInTheDocument();
  });

  it('links title to the detail page and pencil to settings', () => {
    render(
      <RallyeCard
        rallye={{
          id: 12,
          name: 'Rallye 12',
          status: 'running',
          end_time: '2024-01-01',
          password: '',
          created_at: '2024-01-01',
        }}
        questionCount={0}
        uploadQuestionCount={0}
      />
    );

    expect(
      screen.getByRole('link', { name: 'Rallye Rallye 12 öffnen' })
    ).toHaveAttribute('href', '/rallyes/12');
    expect(screen.getByRole('link', { name: 'Einstellungen' })).toHaveAttribute(
      'href',
      '/rallyes/12/settings'
    );
  });

  it('hides the upload photos link when no upload questions exist', () => {
    render(
      <RallyeCard
        rallye={{
          id: 7,
          name: 'Rallye 7',
          status: 'running',
          end_time: '2024-01-01',
          password: '',
          created_at: '2024-01-01',
        }}
        questionCount={0}
        uploadQuestionCount={0}
      />
    );

    expect(
      screen.queryByRole('link', { name: 'Upload-Fotos anzeigen' })
    ).not.toBeInTheDocument();
  });

  it.each(['ranking', 'ended'] as const)(
    'shows the results link when the rallye is %s',
    (status) => {
      render(
        <RallyeCard
          rallye={{
            id: 5,
            name: 'Rallye 5',
            status,
            end_time: '2024-01-01',
            password: '',
            created_at: '2024-01-01',
          }}
          questionCount={0}
          uploadQuestionCount={0}
        />
      );

      expect(
        screen.getByRole('link', { name: 'Endstand anzeigen' })
      ).toHaveAttribute('href', '/rallyes/5/results');
    }
  );

  it('renders optional type badge and context label', () => {
    render(
      <RallyeCard
        rallye={{
          id: 8,
          name: 'Studiengang BWL',
          status: 'inactive',
          end_time: '2024-01-01',
          password: '',
          created_at: '2024-01-01',
        }}
        questionCount={0}
        uploadQuestionCount={0}
        typeLabel="Studiengang"
        contextLabel="Bereich: BWL"
      />
    );

    expect(screen.getByText('Studiengang')).toBeInTheDocument();
    expect(screen.getByLabelText('Rallye-Kontext')).toHaveTextContent(
      'Bereich: BWL'
    );
  });
});
