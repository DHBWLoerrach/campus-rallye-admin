import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QuestionPage from './QuestionPage';
import type { GeocachingFormConfig } from '@/helpers/questions';

interface GeocachingFieldMockProps {
  value: GeocachingFormConfig;
  onChange: (value: GeocachingFormConfig) => void;
  errors: Partial<Record<'target_latitude', string>>;
}

const { push, mockSearchParams, mockCreateQuestion, mockUpdateQuestion } =
  vi.hoisted(() => ({
    push: vi.fn(),
    mockSearchParams: { get: vi.fn(), toString: vi.fn(() => '') },
    mockCreateQuestion: vi.fn(),
    mockUpdateQuestion: vi.fn(),
  }));

vi.mock('@/actions/question', () => ({
  createQuestion: mockCreateQuestion,
  updateQuestion: mockUpdateQuestion,
  deleteQuestion: vi.fn(),
}));

vi.mock('./GeocachingLocationField', () => ({
  default: ({ value, onChange, errors }: GeocachingFieldMockProps) => (
    <div>
      <button
        type="button"
        onClick={() =>
          onChange({
            ...value,
            target_latitude: 47.123456,
            target_longitude: 7.123456,
          })
        }
      >
        Test-Ziel setzen
      </button>
      {errors.target_latitude && <p>{errors.target_latitude}</p>}
    </div>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/questions/new',
}));

describe('QuestionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('explains the type-first flow for a new question', () => {
    render(
      <QuestionPage
        id="new"
        initialData={null}
        categories={[]}
        rallyes={[]}
        initialRallyeIds={[]}
      />
    );

    expect(
      screen.getByText(
        'Zuerst den Fragetyp wählen, dann die passenden Angaben ergänzen.'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        'Frage formulieren, Antworten definieren und optional ein Bild hinterlegen.'
      )
    ).not.toBeInTheDocument();
  });

  it('returns to the provided returnTo param on cancel', () => {
    mockSearchParams.get.mockImplementation((key) => {
      if (key === 'returnTo') return '/rallyes/1/questions';
      return '';
    });

    render(
      <QuestionPage
        id="new"
        initialData={null}
        categories={[]}
        rallyes={[]}
        initialRallyeIds={[]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));

    expect(push).toHaveBeenCalledWith('/rallyes/1/questions');
  });

  it('shows a rallye return link when returnTo is set', () => {
    mockSearchParams.get.mockImplementation((key) => {
      if (key === 'returnTo') return '/rallyes/1/questions';
      return '';
    });

    render(
      <QuestionPage
        id="new"
        initialData={null}
        categories={[]}
        rallyes={[]}
        initialRallyeIds={[]}
      />
    );

    expect(
      screen.getByRole('button', { name: '← Zurück zu Rallye' })
    ).toBeInTheDocument();
  });

  it('explains that copied content creates an independent question', () => {
    mockSearchParams.get.mockImplementation(() => '');

    render(
      <QuestionPage
        id="new"
        initialData={{
          content: 'Wo ist die Mensa?',
          type: 'knowledge',
          solutionOptions: [{ correct: true, text: 'Gebäude A' }],
        }}
        isCopy
        categories={[]}
        rallyes={[]}
        initialRallyeIds={[]}
      />
    );

    expect(
      screen.getByText(
        'Inhalte wurden übernommen. Änderungen wirken sich nicht auf die ursprüngliche Frage aus.'
      )
    ).toBeInTheDocument();
  });

  it('explains that an image must be uploaded again for a picture copy', () => {
    mockSearchParams.get.mockImplementation(() => '');

    render(
      <QuestionPage
        id="new"
        initialData={{
          content: 'Welches Gebäude ist zu sehen?',
          type: 'picture',
          solutionOptions: [{ correct: true, text: 'Gebäude A' }],
        }}
        isCopy
        categories={[]}
        rallyes={[]}
        initialRallyeIds={[]}
      />
    );

    expect(
      screen.getByText(/Das Bild muss neu hochgeladen werden/)
    ).toBeInTheDocument();
  });

  it('mentions copied target and solution for a geocaching copy', () => {
    mockSearchParams.get.mockImplementation(() => '');

    render(
      <QuestionPage
        id="new"
        initialData={{
          content: 'Finde das Ziel',
          type: 'geocaching',
          geocaching: {
            target_latitude: 47,
            target_longitude: 7,
            proximity_radius: 10,
            input_type: 'text',
          },
          solutionOptions: [{ correct: true, text: 'Ziel' }],
        }}
        isCopy
        categories={[]}
        rallyes={[]}
        initialRallyeIds={[]}
      />
    );

    expect(
      screen.getByText(/Zielort und Lösung wurden übernommen/)
    ).toBeInTheDocument();
  });

  it('shows why a requested copy opened an empty form', () => {
    render(
      <QuestionPage
        id="new"
        initialData={null}
        copyError="Die Kopiervorlage konnte nicht geladen werden. Es wurde ein leeres Formular geöffnet."
        categories={[]}
        rallyes={[]}
        initialRallyeIds={[]}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Die Kopiervorlage konnte nicht geladen werden. Es wurde ein leeres Formular geöffnet.'
    );
  });

  it('assigns a new question and derives the rallye return target', async () => {
    mockSearchParams.get.mockImplementation((key) => {
      if (key === 'rallyeId') return '5';
      return '';
    });
    mockCreateQuestion.mockResolvedValue({
      success: true,
      data: { message: 'ok' },
    });

    render(
      <QuestionPage
        id="new"
        initialData={null}
        categories={[]}
        rallyes={[]}
        initialRallyeIds={[]}
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: /Antwort eingeben/ }));
    fireEvent.change(screen.getByLabelText('Frage*'), {
      target: { value: 'Wo ist die Mensa?' },
    });
    fireEvent.change(screen.getByPlaceholderText('Antwort eingeben'), {
      target: { value: 'Gebäude A' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    await waitFor(() =>
      expect(mockCreateQuestion).toHaveBeenCalledWith(
        expect.objectContaining({ rallyeIds: [5] })
      )
    );
    expect(push).toHaveBeenCalledWith('/rallyes/5');
  });

  it('blocks creation when the provided rallye context is invalid', async () => {
    mockSearchParams.get.mockImplementation((key) => {
      if (key === 'rallyeId') return 'invalid';
      return '';
    });
    mockCreateQuestion.mockResolvedValue({
      success: true,
      data: { message: 'ok' },
    });

    render(
      <QuestionPage
        id="new"
        initialData={null}
        categories={[]}
        rallyes={[]}
        initialRallyeIds={[]}
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: /Antwort eingeben/ }));
    fireEvent.change(screen.getByLabelText('Frage*'), {
      target: { value: 'Wo ist die Mensa?' },
    });
    fireEvent.change(screen.getByPlaceholderText('Antwort eingeben'), {
      target: { value: 'Gebäude A' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(mockCreateQuestion).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        'Rallye-Kontext ist ungültig. Frage wurde nicht gespeichert.'
      )
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('submits a complete geocaching configuration on create', async () => {
    mockSearchParams.get.mockImplementation(() => '');
    mockCreateQuestion.mockResolvedValue({ success: true, data: {} });

    render(
      <QuestionPage
        id="new"
        initialData={null}
        categories={[]}
        rallyes={[]}
        initialRallyeIds={[]}
      />
    );

    fireEvent.click(
      screen.getByRole('radio', { name: /Geocaching-Frage.*Zielort finden/ })
    );
    fireEvent.change(screen.getByLabelText('Frage*'), {
      target: { value: 'Finde das Ziel' },
    });
    fireEvent.change(screen.getByPlaceholderText('Antwort eingeben'), {
      target: { value: 'Eingang' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Test-Ziel setzen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    await waitFor(() =>
      expect(mockCreateQuestion).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'geocaching',
          geocaching: {
            target_latitude: 47.123456,
            target_longitude: 7.123456,
            proximity_radius: 10,
            input_type: 'text',
          },
        })
      )
    );
  });

  it('submits geocaching configuration on update', async () => {
    mockSearchParams.get.mockImplementation(() => '');
    mockUpdateQuestion.mockResolvedValue({ success: true, data: {} });

    render(
      <QuestionPage
        id="8"
        initialData={{
          id: 8,
          content: 'Finde das Ziel',
          type: 'geocaching',
          geocaching: {
            target_latitude: 47,
            target_longitude: 7,
            proximity_radius: 15,
            input_type: 'text',
          },
          solutionOptions: [{ id: 3, correct: true, text: 'Eingang' }],
        }}
        categories={[]}
        rallyes={[]}
        initialRallyeIds={[]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    await waitFor(() =>
      expect(mockUpdateQuestion).toHaveBeenCalledWith(
        8,
        expect.objectContaining({
          geocaching: {
            target_latitude: 47,
            target_longitude: 7,
            proximity_radius: 15,
            input_type: 'text',
          },
        })
      )
    );
  });

  it('forwards server issues and clears them before retrying', async () => {
    mockSearchParams.get.mockImplementation(() => '');
    mockCreateQuestion
      .mockResolvedValueOnce({
        success: false,
        error: 'Ungültige Eingabe',
        issues: {
          'geocaching.target_latitude': 'Server-Breitengradfehler',
        },
      })
      .mockResolvedValueOnce({ success: true, data: {} });

    render(
      <QuestionPage
        id="new"
        initialData={{
          content: 'Finde das Ziel',
          type: 'geocaching',
          geocaching: {
            target_latitude: 47,
            target_longitude: 7,
            proximity_radius: 10,
            input_type: 'text',
          },
          solutionOptions: [{ correct: true, text: 'Eingang' }],
        }}
        categories={[]}
        rallyes={[]}
        initialRallyeIds={[]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));
    expect(
      await screen.findByText('Server-Breitengradfehler')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));
    await waitFor(() => expect(mockCreateQuestion).toHaveBeenCalledTimes(2));
    expect(
      screen.queryByText('Server-Breitengradfehler')
    ).not.toBeInTheDocument();
  });

  it('shows assigned rallyes with a global impact hint', () => {
    mockSearchParams.get.mockImplementation(() => '');

    render(
      <QuestionPage
        id="1"
        initialData={null}
        categories={[]}
        rallyes={[
          { id: 1, name: 'Rallye A' },
          { id: 2, name: 'Rallye B' },
        ]}
        initialRallyeIds={[1, 2]}
      />
    );

    expect(screen.getByText('Verwendet in 2 Rallyes:')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Rallye A' })).toHaveAttribute(
      'href',
      '/rallyes/1'
    );
    expect(screen.getByRole('link', { name: 'Rallye B' })).toHaveAttribute(
      'href',
      '/rallyes/2'
    );
    expect(
      screen.getByText('Änderungen wirken in allen zugeordneten Rallyes.')
    ).toBeInTheDocument();
  });

  it('shows a hint when the question is used in no rallye', () => {
    mockSearchParams.get.mockImplementation(() => '');

    render(
      <QuestionPage
        id="1"
        initialData={null}
        categories={[]}
        rallyes={[]}
        initialRallyeIds={[]}
      />
    );

    expect(screen.getByText(/In keiner Rallye verwendet/)).toBeInTheDocument();
  });

  it('prompts before navigating via link when form is dirty', () => {
    mockSearchParams.get.mockImplementation(() => '');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <QuestionPage
        id="1"
        initialData={{
          id: 1,
          content: 'Beispielfrage',
          type: 'knowledge',
          solutionOptions: [{ id: 1, correct: true, text: 'Antwort' }],
        }}
        categories={[]}
        rallyes={[{ id: 1, name: 'Rallye A' }]}
        initialRallyeIds={[1]}
      />
    );

    fireEvent.change(screen.getByLabelText('Frage*'), {
      target: { value: 'Neue Frage' },
    });
    fireEvent.click(screen.getByRole('link', { name: 'Rallye A' }));

    expect(confirmSpy).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('allows navigation via link when user confirms leaving dirty form', () => {
    mockSearchParams.get.mockImplementation(() => '');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <QuestionPage
        id="1"
        initialData={{
          id: 1,
          content: 'Beispielfrage',
          type: 'knowledge',
          solutionOptions: [{ id: 1, correct: true, text: 'Antwort' }],
        }}
        categories={[]}
        rallyes={[{ id: 1, name: 'Rallye A' }]}
        initialRallyeIds={[1]}
      />
    );

    fireEvent.change(screen.getByLabelText('Frage*'), {
      target: { value: 'Neue Frage' },
    });
    fireEvent.click(screen.getByRole('link', { name: 'Rallye A' }));

    expect(confirmSpy).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('prompts before cancel when form is dirty', () => {
    mockSearchParams.get.mockImplementation((key) => {
      if (key === 'returnTo') return '/rallyes/1/questions';
      return '';
    });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <QuestionPage
        id="1"
        initialData={{
          id: 1,
          content: 'Beispielfrage',
          type: 'knowledge',
          solutionOptions: [{ id: 1, correct: true, text: 'Antwort' }],
        }}
        categories={[]}
        rallyes={[]}
        initialRallyeIds={[]}
      />
    );

    fireEvent.change(screen.getByLabelText('Frage*'), {
      target: { value: 'Geänderte Frage' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
