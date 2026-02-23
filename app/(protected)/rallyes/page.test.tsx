import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Home from './page';

const {
  mockCreateClient,
  mockEventDialogProps,
  mockProgramDialogProps,
} = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockEventDialogProps: [] as Array<{ organizations: { id: number; name: string }[] }>,
  mockProgramDialogProps: [] as Array<{ departments: { id: number; name: string }[] }>,
}));

vi.mock('@/lib/supabase', () => ({
  default: mockCreateClient,
}));

vi.mock('@/components/rallyes/EventRallyeDialog', () => ({
  __esModule: true,
  default: (props: { organizations: { id: number; name: string }[] }) => {
    mockEventDialogProps.push(props);
    return <button type="button">Event erstellen</button>;
  },
}));

vi.mock('@/components/rallyes/ProgramRallyeDialog', () => ({
  __esModule: true,
  default: (props: { departments: { id: number; name: string }[] }) => {
    mockProgramDialogProps.push(props);
    return <button type="button">Rallye erstellen</button>;
  },
}));

vi.mock('@/components/Rallye', () => ({
  __esModule: true,
  default: ({
    rallye,
    uploadQuestionCount,
  }: {
    rallye: { id: number; name: string };
    uploadQuestionCount?: number;
  }) => (
    <article data-testid="rallye-item">
      <p>{rallye.name}</p>
      <button type="button">Bearbeiten</button>
      <span>Status</span>
      <span>Ende</span>
      <a href={`/rallyes/${rallye.id}/questions`}>Fragen zuordnen</a>
      {uploadQuestionCount && uploadQuestionCount > 0 ? (
        <span>Upload-Fotos anzeigen</span>
      ) : null}
    </article>
  ),
}));

type MockRow = Record<string, unknown>;

type SupabaseFixture = {
  rallyes: Array<Record<string, unknown>>;
  organizations: Array<Record<string, unknown>>;
  departments: Array<Record<string, unknown>>;
  departmentAssignments: Array<Record<string, unknown>>;
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
    },
    {
      id: 2,
      name: 'Event A',
      status: 'inactive',
      end_time: '2026-01-01T00:00:00.000Z',
      password: '',
      created_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 3,
      name: 'Informatik 1',
      status: 'running',
      end_time: '2026-01-01T00:00:00.000Z',
      password: '',
      created_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 4,
      name: 'Freie Rallye',
      status: 'preparing',
      end_time: '2026-01-01T00:00:00.000Z',
      password: '',
      created_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 5,
      name: 'BWL 1',
      status: 'inactive',
      end_time: '2026-01-01T00:00:00.000Z',
      password: '',
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ];

  const organizations: SupabaseFixture['organizations'] = [
    { id: 10, name: 'Org A', default_rallye_id: 1 },
  ];
  const departments: SupabaseFixture['departments'] = [
    { id: 100, name: 'Org A', organization_id: 10 },
    { id: 103, name: ' org a ', organization_id: 10 },
    { id: 101, name: 'Informatik', organization_id: 10 },
    { id: 102, name: 'BWL', organization_id: 10 },
  ];
  const departmentAssignments: SupabaseFixture['departmentAssignments'] = [
    { rallye_id: 1, department_id: 101 },
    { rallye_id: 2, department_id: 100 },
    { rallye_id: 3, department_id: 101 },
    { rallye_id: 5, department_id: 102 },
  ];
  const questionAssignments: SupabaseFixture['questionAssignments'] = [
    { rallye_id: 1, question_id: 1 },
    { rallye_id: 2, question_id: 2 },
    { rallye_id: 3, question_id: 3 },
    { rallye_id: 5, question_id: 4 },
  ];
  const uploadQuestionAssignments: SupabaseFixture['uploadQuestionAssignments'] = [
    { rallye_id: 2, questions: { type: 'upload' } },
  ];

  return {
    rallyes,
    organizations,
    departments,
    departmentAssignments,
    questionAssignments,
    uploadQuestionAssignments,
  };
}

function createSupabaseMock(fixtureOverrides?: Partial<SupabaseFixture>) {
  const fixture = { ...buildDefaultFixture(), ...fixtureOverrides };
  const {
    rallyes,
    organizations,
    departments,
    departmentAssignments,
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
    organization: {
      select: async () => ({ data: organizations, error: null }),
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
    join_department_rallye: {
      select: () => ({
        in: async () => ({ data: departmentAssignments, error: null }),
      }),
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
    mockEventDialogProps.length = 0;
    mockProgramDialogProps.length = 0;
    mockCreateClient.mockResolvedValue(createSupabaseMock());
  });

  it('groups rallyes into the four UI sections', async () => {
    render(await Home());

    const explorationSection = getSectionByTitle('Erkundungsmodus');
    const eventSection = getSectionByTitle('Events');
    const programSection = getSectionByTitle('Studiengänge');
    const otherSection = getSectionByTitle('Weitere Rallyes');

    expect(within(explorationSection).getByText('Campus Tour A')).toBeInTheDocument();
    expect(within(eventSection).getByText('Event A')).toBeInTheDocument();
    expect(within(programSection).getByText('Informatik 1')).toBeInTheDocument();
    expect(within(programSection).getByText('BWL 1')).toBeInTheDocument();
    expect(within(otherSection).getByText('Freie Rallye')).toBeInTheDocument();

    expect(mockEventDialogProps[0]?.organizations.map((org) => org.name)).toEqual([
      'Org A',
    ]);
    expect(mockProgramDialogProps[0]?.departments.map((dept) => dept.name)).toEqual([
      'Informatik',
      'BWL',
    ]);
  });

  it('renders exploration rallyes as read-only rows', async () => {
    render(await Home());

    const explorationSection = getSectionByTitle('Erkundungsmodus');
    const eventSection = getSectionByTitle('Events');

    expect(within(explorationSection).getByText('Campus Tour A')).toBeInTheDocument();
    expect(within(explorationSection).getByText('Organisation: Org A')).toBeInTheDocument();
    expect(
      within(explorationSection).getByRole('link', { name: 'Fragen zuordnen' })
    ).toHaveAttribute('href', '/rallyes/1/questions');

    expect(within(explorationSection).queryByText('Bearbeiten')).not.toBeInTheDocument();
    expect(
      within(explorationSection).queryByText('Upload-Fotos anzeigen')
    ).not.toBeInTheDocument();
    expect(within(explorationSection).queryByText('Status')).not.toBeInTheDocument();
    expect(within(explorationSection).queryByText('Ende')).not.toBeInTheDocument();

    expect(within(eventSection).getByText('Bearbeiten')).toBeInTheDocument();
    expect(within(eventSection).getByText('Upload-Fotos anzeigen')).toBeInTheDocument();
    expect(screen.getAllByTestId('rallye-item')).toHaveLength(4);
  });

  it('groups program rallyes by department', async () => {
    render(await Home());

    const programSection = getSectionByTitle('Studiengänge');

    expect(
      within(programSection).getByRole('heading', { level: 3, name: 'BWL' })
    ).toBeInTheDocument();
    expect(
      within(programSection).getByRole('heading', { level: 3, name: 'Informatik' })
    ).toBeInTheDocument();
    expect(within(programSection).getByText('BWL 1')).toBeInTheDocument();
    expect(within(programSection).getByText('Informatik 1')).toBeInTheDocument();
  });

  it('shows section-level create buttons and no global create button in header', async () => {
    render(await Home());

    const pageHeader = screen
      .getByRole('heading', { level: 1, name: 'Rallyes verwalten' })
      .closest('section');
    if (!pageHeader) {
      throw new Error('Page header section not found');
    }
    const eventSection = getSectionByTitle('Events');
    const programSection = getSectionByTitle('Studiengänge');

    expect(within(pageHeader).queryByRole('button', { name: 'Rallye erstellen' })).toBeNull();
    expect(within(eventSection).getByRole('button', { name: 'Event erstellen' })).toBeInTheDocument();
    expect(
      within(programSection).getByRole('button', { name: 'Rallye erstellen' })
    ).toBeInTheDocument();
  });

  it('keeps section-level create buttons visible for empty event and program sections', async () => {
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
          },
        ],
        departmentAssignments: [{ rallye_id: 1, department_id: 101 }],
        questionAssignments: [{ rallye_id: 1, question_id: 1 }],
        uploadQuestionAssignments: [],
      })
    );

    render(await Home());

    const eventSection = getSectionByTitle('Events');
    const programSection = getSectionByTitle('Studiengänge');

    expect(within(eventSection).getByRole('button', { name: 'Event erstellen' })).toBeInTheDocument();
    expect(
      within(programSection).getByRole('button', { name: 'Rallye erstellen' })
    ).toBeInTheDocument();
    expect(
      within(eventSection).getByText('Keine Rallyes in diesem Bereich.')
    ).toBeInTheDocument();
    expect(
      within(programSection).getByText('Keine Rallyes in diesem Bereich.')
    ).toBeInTheDocument();
  });
});
