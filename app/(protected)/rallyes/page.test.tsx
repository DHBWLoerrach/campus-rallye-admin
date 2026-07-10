import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Home from './page';

const { mockCreateClient, mockGetUserContext, mockGetLocalUser } = vi.hoisted(
  () => ({
    mockCreateClient: vi.fn(),
    mockGetUserContext: vi.fn(),
    mockGetLocalUser: vi.fn(),
  })
);

vi.mock('@/lib/supabase', () => ({
  default: mockCreateClient,
}));

vi.mock('@/lib/user-context', () => ({
  getUserContext: mockGetUserContext,
}));

vi.mock('@/lib/db/local-user', () => ({
  getLocalUser: mockGetLocalUser,
}));

vi.mock('@/components/RallyeCard', () => ({
  __esModule: true,
  default: ({
    rallye,
    contextLabel,
  }: {
    rallye: { id: number; name: string };
    contextLabel?: string;
  }) => (
    <article data-testid="rallye-card">
      <a href={`/rallyes/${rallye.id}`}>{rallye.name}</a>
      {contextLabel && <p>{contextLabel}</p>}
    </article>
  ),
}));

type SupabaseFixture = {
  rallyes: Array<Record<string, unknown>>;
  locations: Array<Record<string, unknown>>;
  departments: Array<Record<string, unknown>>;
  questionAssignments: Array<Record<string, unknown>>;
};

const makeRallye = (
  id: number,
  name: string,
  status: string,
  departmentId: number | null
) => ({
  id,
  name,
  status,
  end_time: '18:00:00',
  password: '',
  created_at: '2026-01-01T00:00:00.000Z',
  department_id: departmentId,
});

function buildDefaultFixture(): SupabaseFixture {
  return {
    rallyes: [
      makeRallye(1, 'Campus Tour A', 'ready', 101),
      makeRallye(2, 'Marketing läuft', 'running', 100),
      makeRallye(3, 'Marketing Entwurf', 'draft', 100),
      makeRallye(4, 'Marketing fertig', 'ended', 100),
      makeRallye(5, 'Informatik 1', 'running', 101),
    ],
    locations: [{ id: 10, name: 'Loc A', default_rallye_id: 1 }],
    departments: [
      { id: 100, name: 'HoKo/Marketing', location_id: 10 },
      { id: 101, name: 'Informatik', location_id: 10 },
    ],
    questionAssignments: [
      { rallye_id: 2, question_id: 1 },
      { rallye_id: 5, question_id: 2 },
    ],
  };
}

function createSupabaseMock(fixtureOverrides?: Partial<SupabaseFixture>) {
  const fixture = { ...buildDefaultFixture(), ...fixtureOverrides };
  const byTable: Record<string, { select: (columns: string) => unknown }> = {
    rallye: {
      select: () => ({
        order: async () => ({ data: fixture.rallyes, error: null }),
      }),
    },
    location: {
      select: async () => ({ data: fixture.locations, error: null }),
    },
    department: {
      select: () => ({
        order: async () => ({ data: fixture.departments, error: null }),
      }),
    },
    join_rallye_questions: {
      select: () => ({
        in: async () => ({ data: fixture.questionAssignments, error: null }),
      }),
    },
  };
  return {
    from: (table: string) =>
      byTable[table] as unknown as Record<string, unknown>,
  };
}

describe('/rallyes page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateClient.mockResolvedValue(createSupabaseMock());
    mockGetUserContext.mockResolvedValue({
      uuid: 'user-1',
      email: 'a@b.de',
      roles: ['staff'],
    });
    mockGetLocalUser.mockReturnValue({
      user_id: 'user-1',
      email: 'a@b.de',
      registered_at: '2026-01-01',
      admin: false,
      department_id: 100,
    });
  });

  it('groups own department rallyes by phase', async () => {
    render(await Home());

    const live = screen
      .getByRole('heading', { name: '● Läuft gerade' })
      .closest('section') as HTMLElement;
    const preparation = screen
      .getByRole('heading', { name: '○ In Vorbereitung' })
      .closest('section') as HTMLElement;
    const done = screen
      .getByRole('heading', { name: '✓ Abgeschlossen' })
      .closest('section') as HTMLElement;

    expect(within(live).getByText('Marketing läuft')).toBeInTheDocument();
    expect(
      within(preparation).getByText('Marketing Entwurf')
    ).toBeInTheDocument();
    expect(within(done).getByText('Marketing fertig')).toBeInTheDocument();
  });

  it('shows the own department name in the header', async () => {
    render(await Home());
    expect(screen.getByText(/HoKo\/Marketing/)).toBeInTheDocument();
  });

  it('collapses other departments and campus tours', async () => {
    render(await Home());

    const others = screen
      .getByText(/Andere Bereiche/)
      .closest('details') as HTMLElement;
    expect(others).not.toHaveAttribute('open');
    expect(within(others).getByText('Informatik 1')).toBeInTheDocument();

    const tours = screen
      .getByText(/Campus-Touren/)
      .closest('details') as HTMLElement;
    expect(within(tours).getByText('Campus Tour A')).toBeInTheDocument();
  });

  it('shows all rallyes in phase groups when the user has no department', async () => {
    mockGetLocalUser.mockReturnValue({
      user_id: 'user-1',
      email: 'a@b.de',
      registered_at: '2026-01-01',
      admin: false,
      department_id: null,
    });

    render(await Home());

    const live = screen
      .getByRole('heading', { name: '● Läuft gerade' })
      .closest('section') as HTMLElement;
    expect(within(live).getByText('Marketing läuft')).toBeInTheDocument();
    expect(within(live).getByText('Informatik 1')).toBeInTheDocument();
    expect(screen.queryByText(/Andere Bereiche/)).not.toBeInTheDocument();
  });

  it('renders the create link in the page header', async () => {
    render(await Home());
    expect(screen.getByRole('link', { name: '+ Neue Rallye' })).toHaveAttribute(
      'href',
      '/rallyes/new'
    );
  });

  it('hides empty phase groups', async () => {
    mockCreateClient.mockResolvedValue(
      createSupabaseMock({
        rallyes: [makeRallye(2, 'Marketing läuft', 'running', 100)],
        questionAssignments: [],
      })
    );

    render(await Home());

    expect(
      screen.getByRole('heading', { name: '● Läuft gerade' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: '✓ Abgeschlossen' })
    ).not.toBeInTheDocument();
  });

  it('sorts planned ends by local clock time within each phase group', async () => {
    mockCreateClient.mockResolvedValue(
      createSupabaseMock({
        rallyes: [
          { ...makeRallye(1, 'Ohne Ende', 'running', 100), end_time: null },
          {
            ...makeRallye(2, 'Später', 'running', 100),
            end_time: '18:00:00',
          },
          {
            ...makeRallye(3, 'Früher', 'running', 100),
            end_time: '09:00:00',
          },
          {
            ...makeRallye(4, 'Früh beendet', 'ended', 100),
            end_time: '09:00:00',
          },
          {
            ...makeRallye(5, 'Spät beendet', 'ended', 100),
            end_time: '18:00:00',
          },
        ],
        locations: [],
        departments: [{ id: 100, name: 'HoKo/Marketing', location_id: 10 }],
        questionAssignments: [],
      })
    );

    render(await Home());

    const live = screen
      .getByRole('heading', { name: '● Läuft gerade' })
      .closest('section') as HTMLElement;
    const done = screen
      .getByRole('heading', { name: '✓ Abgeschlossen' })
      .closest('section') as HTMLElement;

    expect(
      within(live)
        .getAllByTestId('rallye-card')
        .map((card) => card.textContent)
    ).toEqual(['Früher', 'Später', 'Ohne Ende']);
    expect(
      within(done)
        .getAllByTestId('rallye-card')
        .map((card) => card.textContent)
    ).toEqual(['Spät beendet', 'Früh beendet']);
  });
});
