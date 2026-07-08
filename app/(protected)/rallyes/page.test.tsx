import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Home from './page';

const { mockCreateClient, mockProgramDialogProps } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockProgramDialogProps: [] as Array<{
    departments: { id: number; name: string }[];
  }>,
}));

vi.mock('@/lib/supabase', () => ({
  default: mockCreateClient,
}));

vi.mock('@/components/rallyes/ProgramRallyeDialog', () => ({
  __esModule: true,
  default: (props: { departments: { id: number; name: string }[] }) => {
    mockProgramDialogProps.push(props);
    return <button type="button">Rallye erstellen</button>;
  },
}));

vi.mock('@/components/RallyeCard', () => ({
  __esModule: true,
  default: ({ rallye }: { rallye: { id: number; name: string } }) => (
    <article data-testid="rallye-item">
      <p>{rallye.name}</p>
      <button type="button">Bearbeiten</button>
      <span>Status</span>
      <span>Ende</span>
      <a href={`/rallyes/${rallye.id}`}>Fragen zuordnen</a>
    </article>
  ),
}));

type MockRow = Record<string, unknown>;

type SupabaseFixture = {
  rallyes: Array<Record<string, unknown>>;
  locations: Array<Record<string, unknown>>;
  departments: Array<Record<string, unknown>>;
  questionAssignments: Array<Record<string, unknown>>;
  uploadQuestionAssignments: Array<Record<string, unknown>>;
};

function buildDefaultFixture(): SupabaseFixture {
  const rallyes: SupabaseFixture['rallyes'] = [
    {
      id: 1,
      name: 'Campus Tour A',
      status: 'inactive',
      end_time: '2026-01-01T00:00:00.000Z',
      password: '',
      created_at: '2026-01-01T00:00:00.000Z',
      department_id: 101,
    },
    {
      id: 2,
      name: 'Event A',
      status: 'inactive',
      end_time: '2026-01-01T00:00:00.000Z',
      password: '',
      created_at: '2026-01-01T00:00:00.000Z',
      department_id: 100,
    },
    {
      id: 3,
      name: 'Informatik 1',
      status: 'running',
      end_time: '2026-01-01T00:00:00.000Z',
      password: '',
      created_at: '2026-01-01T00:00:00.000Z',
      department_id: 101,
    },
    {
      id: 4,
      name: 'Freie Rallye',
      status: 'preparing',
      end_time: '2026-01-01T00:00:00.000Z',
      password: '',
      created_at: '2026-01-01T00:00:00.000Z',
      department_id: null,
    },
    {
      id: 5,
      name: 'BWL 1',
      status: 'inactive',
      end_time: '2026-01-01T00:00:00.000Z',
      password: '',
      created_at: '2026-01-01T00:00:00.000Z',
      department_id: 102,
    },
  ];

  const locations: SupabaseFixture['locations'] = [
    { id: 10, name: 'Loc A', default_rallye_id: 1 },
  ];
  const departments: SupabaseFixture['departments'] = [
    { id: 100, name: 'Loc A', location_id: 10 },
    { id: 103, name: ' loc a ', location_id: 10 },
    { id: 101, name: 'Informatik', location_id: 10 },
    { id: 102, name: 'BWL', location_id: 10 },
  ];
  const questionAssignments: SupabaseFixture['questionAssignments'] = [
    { rallye_id: 1, question_id: 1 },
    { rallye_id: 2, question_id: 2 },
    { rallye_id: 3, question_id: 3 },
    { rallye_id: 5, question_id: 4 },
  ];
  const uploadQuestionAssignments: SupabaseFixture['uploadQuestionAssignments'] =
    [{ rallye_id: 2, questions: { type: 'upload' } }];

  return {
    rallyes,
    locations,
    departments,
    questionAssignments,
    uploadQuestionAssignments,
  };
}

function createSupabaseMock(fixtureOverrides?: Partial<SupabaseFixture>) {
  const fixture = { ...buildDefaultFixture(), ...fixtureOverrides };
  const {
    rallyes,
    locations,
    departments,
    questionAssignments,
    uploadQuestionAssignments,
  } = fixture;

  const byTable: Record<
    string,
    {
      select: (columns: string) => unknown;
    }
  > = {
    rallye: {
      select: () => ({
        order: async () => ({ data: rallyes, error: null }),
      }),
    },
    location: {
      select: async () => ({ data: locations, error: null }),
    },
    department: {
      select: () => ({
        order: async () => ({ data: departments, error: null }),
      }),
    },
    join_rallye_questions: {
      select: (columns: string) => {
        if (columns.includes('question_id')) {
          return {
            in: async () => ({ data: questionAssignments, error: null }),
          };
        }
        return {
          in: () => ({
            eq: async () => ({ data: uploadQuestionAssignments, error: null }),
          }),
        };
      },
    },
  };

  return {
    from: (table: string) => byTable[table] as unknown as MockRow,
  };
}

function getSectionByTitle(title: string): HTMLElement {
  const heading = screen.getByRole('heading', { level: 2, name: title });
  const section = heading.closest('section');
  if (!section) {
    throw new Error(`Section for "${title}" not found`);
  }
  return section;
}

describe('/rallyes page', () => {
  beforeEach(() => {
    mockCreateClient.mockReset();
    mockProgramDialogProps.length = 0;
    mockCreateClient.mockResolvedValue(createSupabaseMock());
  });

  it('groups rallyes into exploration and team rallyes sections', async () => {
    render(await Home());

    const explorationSection = getSectionByTitle('Erkundungsmodus');
    const rallyesSection = getSectionByTitle('Rallyes');

    expect(
      within(explorationSection).getByText('Campus Tour A')
    ).toBeInTheDocument();
    expect(within(rallyesSection).getByText('Event A')).toBeInTheDocument();
    expect(
      within(rallyesSection).getByText('Informatik 1')
    ).toBeInTheDocument();
    expect(within(rallyesSection).getByText('BWL 1')).toBeInTheDocument();
    expect(
      within(rallyesSection).getByText('Freie Rallye')
    ).toBeInTheDocument();

    expect(
      mockProgramDialogProps[0]?.departments.map((dept) => dept.name)
    ).toEqual(['Loc A', ' loc a ', 'Informatik', 'BWL']);
  });

  it('renders exploration rallyes as read-only rows', async () => {
    render(await Home());

    const explorationSection = getSectionByTitle('Erkundungsmodus');
    const rallyesSection = getSectionByTitle('Rallyes');

    expect(
      within(explorationSection).getByText('Campus Tour A')
    ).toBeInTheDocument();
    expect(
      within(explorationSection).queryByText('Standort: Loc A')
    ).not.toBeInTheDocument();
    expect(
      within(explorationSection).getByRole('link', { name: 'Fragen zuordnen' })
    ).toHaveAttribute('href', '/rallyes/1');

    expect(
      within(explorationSection).queryByText('Bearbeiten')
    ).not.toBeInTheDocument();
    expect(
      within(explorationSection).queryByText('Upload-Fotos anzeigen')
    ).not.toBeInTheDocument();
    expect(
      within(explorationSection).queryByText('Status')
    ).not.toBeInTheDocument();
    expect(
      within(explorationSection).queryByText('Ende')
    ).not.toBeInTheDocument();

    expect(
      within(rallyesSection).getAllByRole('button', { name: 'Bearbeiten' })
        .length
    ).toBeGreaterThan(0);
    expect(screen.getAllByTestId('rallye-item')).toHaveLength(4);
  });

  it('groups rallyes by assigned department with fallback groups', async () => {
    render(await Home());

    const rallyesSection = getSectionByTitle('Rallyes');

    expect(
      within(rallyesSection).getByRole('heading', { level: 3, name: 'BWL' })
    ).toBeInTheDocument();
    expect(
      within(rallyesSection).getByRole('heading', {
        level: 3,
        name: 'Informatik',
      })
    ).toBeInTheDocument();
    expect(
      within(rallyesSection).getByRole('heading', {
        level: 3,
        name: 'Ohne Bereich',
      })
    ).toBeInTheDocument();
    expect(within(rallyesSection).getByText('BWL 1')).toBeInTheDocument();
    expect(
      within(rallyesSection).getByText('Informatik 1')
    ).toBeInTheDocument();
  });

  it('shows create button only in rallyes section and no global create button in header', async () => {
    render(await Home());

    const pageHeader = screen
      .getByRole('heading', { level: 1, name: 'Rallyes verwalten' })
      .closest('section');
    if (!pageHeader) {
      throw new Error('Page header section not found');
    }
    const rallyesSection = getSectionByTitle('Rallyes');

    expect(
      within(pageHeader).queryByRole('button', { name: 'Rallye erstellen' })
    ).toBeNull();
    expect(
      within(rallyesSection).getByRole('button', { name: 'Rallye erstellen' })
    ).toBeInTheDocument();
  });

  it('keeps section-level create button visible for empty rallyes section', async () => {
    mockCreateClient.mockResolvedValue(
      createSupabaseMock({
        rallyes: [
          {
            id: 1,
            name: 'Campus Tour A',
            status: 'inactive',
            end_time: '2026-01-01T00:00:00.000Z',
            password: '',
            created_at: '2026-01-01T00:00:00.000Z',
            department_id: 101,
          },
        ],
        questionAssignments: [{ rallye_id: 1, question_id: 1 }],
        uploadQuestionAssignments: [],
      })
    );

    render(await Home());

    const rallyesSection = getSectionByTitle('Rallyes');

    expect(
      within(rallyesSection).getByRole('button', { name: 'Rallye erstellen' })
    ).toBeInTheDocument();
    expect(
      within(rallyesSection).getByText('Keine Rallyes in diesem Bereich.')
    ).toBeInTheDocument();
  });
});
