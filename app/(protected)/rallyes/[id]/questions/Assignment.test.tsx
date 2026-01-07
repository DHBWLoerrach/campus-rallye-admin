import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Assignment from './Assignment';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as questionActions from '@/actions/question';
import * as assignActions from '@/actions/assign_questions_to_rallye';
import { Question } from '@/helpers/questions';

// Mock the dependent modules
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/actions/question', () => ({
  getQuestions: vi.fn(),
}));

vi.mock('@/actions/assign_questions_to_rallye', () => ({
  assignQuestionsToRallye: vi.fn(),
  getQuestionRallyeMap: vi.fn(),
}));

// Mock Data
const mockQuestions: Question[] = [
  { id: 1, content: 'Frage 1', type: 'multiple_choice' },
  { id: 2, content: 'Frage 2', type: 'qr_code' },
  { id: 3, content: 'Frage 3', type: 'text' },
];

describe('Assignment Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (questionActions.getQuestions as any).mockResolvedValue({
      success: true,
      data: mockQuestions,
    });
    (assignActions.getQuestionRallyeMap as any).mockResolvedValue({
      success: true,
      data: {},
    });
    (assignActions.assignQuestionsToRallye as any).mockResolvedValue({
      success: true,
    });
  });

  it('renders correctly with initial data', async () => {
    render(
      <Assignment
        rallyeId={1}
        rallyeName="Test Rallye"
        initialQuestions={mockQuestions}
        initialSelectedQuestions={[1]}
        initialCategories={[]}
      />
    );

    // Right column (Assigned) should show Question 1
    const assignedSection = screen.getByText(/Zugewiesen \(1\)/);
    expect(assignedSection).toBeDefined();

    // Check headers - using regex for flexible matching of line breaks/spaces
    expect(screen.getByText(/Verfügbare Fragen \(2\)/)).toBeDefined();
    // Flexibler Regex, der Whitespace erlaubt
    expect(screen.getByText(/Fragen-Zuordnung:\s*Test Rallye/)).toBeDefined();
  });

  it('moves a question from available to assigned (Left to Right)', async () => {
    render(
      <Assignment
        rallyeId={1}
        initialQuestions={mockQuestions}
        initialSelectedQuestions={[]} // Start empty
        initialCategories={[]}
      />
    );

    // Initially 3 available, 0 assigned
    expect(screen.getByText(/Verfügbare Fragen \(3\)/)).toBeDefined();
    expect(screen.getByText(/Zugewiesen \(0\)/)).toBeDefined();

    // Find the "Add" button for Question 1
    const addButton = screen.getByLabelText('add-question-1');
    fireEvent.click(addButton);

    // Now: 2 available, 1 assigned
    await waitFor(() => {
      expect(screen.getByText(/Verfügbare Fragen \(2\)/)).toBeDefined();
      expect(screen.getByText(/Zugewiesen \(1\)/)).toBeDefined();
    });
  });

  it('moves a question from assigned to available (Right to Left)', async () => {
    render(
      <Assignment
        rallyeId={1}
        initialQuestions={mockQuestions}
        initialSelectedQuestions={[1]} // Start with 1 assigned
        initialCategories={[]}
      />
    );

    expect(screen.getByText(/Zugewiesen \(1\)/)).toBeDefined();

    // Find remove button for Question 1 in the assigned list.
    const removeButton = screen.getByLabelText('remove-question-1');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.getByText(/Zugewiesen \(0\)/)).toBeDefined();
      expect(screen.getByText(/Verfügbare Fragen \(3\)/)).toBeDefined();
    });
  });

  it('detects unsaved changes', async () => {
    render(
      <Assignment
        rallyeId={1}
        initialQuestions={mockQuestions}
        initialSelectedQuestions={[]}
        initialCategories={[]}
      />
    );

    expect(screen.queryByText(/Ungespeicherte Änderungen/)).toBeNull();

    // Add a question
    const addButton = screen.getByLabelText('add-question-1');
    fireEvent.click(addButton);

    // Badge should appear
    await waitFor(() => {
      expect(screen.getByText(/Ungespeicherte Änderungen/)).toBeDefined();
    });
  });

  it('saves changes correctly', async () => {
    render(
      <Assignment
        rallyeId={123}
        initialQuestions={mockQuestions}
        initialSelectedQuestions={[]}
        initialCategories={[]}
      />
    );

    // Add Question 1
    const addButton = screen.getByLabelText('add-question-1');
    fireEvent.click(addButton);

    // Click Save
    const saveButton = screen.getByText('Änderungen speichern');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(assignActions.assignQuestionsToRallye).toHaveBeenCalledWith(123, [
        1,
      ]);
    });
  });
});
