import { beforeEach, describe, expect, it, vi } from 'vitest';
import Page from './page';

const {
  mockCreateClient,
  mockGetQuestionRallyeMap,
  mockGetRallyeMaxPoints,
  mockNotFound,
} = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockGetQuestionRallyeMap: vi.fn(),
  mockGetRallyeMaxPoints: vi.fn(),
  mockNotFound: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  default: mockCreateClient,
}));

vi.mock('@/actions/assign_questions_to_rallye', () => ({
  getQuestionRallyeMap: mockGetQuestionRallyeMap,
}));

vi.mock('@/actions/rallye-results', () => ({
  getRallyeMaxPoints: mockGetRallyeMaxPoints,
}));

vi.mock('next/navigation', () => ({
  notFound: mockNotFound,
}));

vi.mock('./Assignment', () => ({
  __esModule: true,
  default: () => <div>Assignment</div>,
}));

function createSupabaseMock({
  assignmentError = null,
}: {
  assignmentError?: unknown;
}) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'rallye') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: { id: 1, name: 'Test Rallye' },
                error: null,
              })),
            })),
          })),
        };
      }

      if (table === 'join_rallye_questions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(async () => ({
              data: assignmentError
                ? null
                : [{ question_id: 10, is_voting: true }],
              error: assignmentError,
            })),
          })),
        };
      }

      if (table === 'questions') {
        return {
          select: vi.fn(async () => ({
            data: [{ id: 10, content: 'Upload', type: 'upload' }],
            error: null,
          })),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
  };
}

describe('/rallyes/[id]/questions page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetQuestionRallyeMap.mockResolvedValue({ success: true, data: {} });
    mockGetRallyeMaxPoints.mockResolvedValue({ success: true, data: 0 });
    mockNotFound.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND');
    });
  });

  it('does not render an empty assignment state when assignment loading fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCreateClient.mockResolvedValue(
      createSupabaseMock({ assignmentError: { message: 'boom' } })
    );

    await expect(
      Page({ params: Promise.resolve({ id: '1' }) })
    ).rejects.toThrow('Fragen-Zuordnungen konnten nicht geladen werden');
  });
});
