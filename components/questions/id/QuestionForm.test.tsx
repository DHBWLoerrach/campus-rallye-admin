import { fireEvent, render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import QuestionForm from './QuestionForm';
import type {
  SolutionOption,
  Question,
  QuestionFormData,
  GeocachingFormConfig,
} from '@/helpers/questions';

interface GeocachingFieldMockProps {
  value: GeocachingFormConfig;
  onChange: (value: GeocachingFormConfig) => void;
  errors: Partial<
    Record<'target_latitude' | 'target_longitude' | 'proximity_radius', string>
  >;
}

vi.mock('./GeocachingLocationField', () => ({
  default: ({ value, onChange, errors }: GeocachingFieldMockProps) => (
    <div data-testid="geocaching-location-field">
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
        Kartenziel setzen
      </button>
      <label>
        Test-Breitengrad
        <input
          value={value.target_latitude ?? ''}
          onChange={(event) =>
            onChange({
              ...value,
              target_latitude:
                event.target.value === ''
                  ? undefined
                  : Number(event.target.value),
            })
          }
        />
      </label>
      <label>
        Test-Radius
        <input
          value={value.proximity_radius ?? ''}
          onChange={(event) =>
            onChange({
              ...value,
              proximity_radius:
                event.target.value === ''
                  ? undefined
                  : Number(event.target.value),
            })
          }
        />
      </label>
      {errors.target_latitude && <p>{errors.target_latitude}</p>}
      {errors.target_longitude && <p>{errors.target_longitude}</p>}
      {errors.proximity_radius && <p>{errors.proximity_radius}</p>}
    </div>
  ),
}));

describe('QuestionForm', () => {
  it('normalizes null values to empty strings for inputs', () => {
    const initialData = {
      hint: null,
      category: null,
      type: 'knowledge',
      solutionOptions: [{ id: 1, correct: true, text: null }],
    } as unknown as Partial<Question>;

    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    render(
      <QuestionForm
        initialData={initialData}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={['Test Category']}
      />
    );

    expect(screen.getByLabelText('Hinweis')).toHaveValue('');
    expect(screen.getByPlaceholderText(/Antwort/i)).toHaveValue('');

    const hasNullValueWarning = consoleErrorSpy.mock.calls.some((call) =>
      call.some(
        (arg) =>
          typeof arg === 'string' &&
          arg.includes('value prop on `input` should not be null')
      )
    );
    expect(hasNullValueWarning).toBe(false);

    consoleErrorSpy.mockRestore();
  });

  it('submits without a rallyeIds field so assignments stay untouched', () => {
    const handleSubmit = vi.fn();

    render(
      <QuestionForm
        initialData={{
          content: 'Was ist die Antwort?',
          type: 'knowledge',
          solutionOptions: [{ id: 1, correct: true, text: '42' }],
        }}
        onSubmit={handleSubmit}
        onCancel={vi.fn()}
        categories={[]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit.mock.calls[0][0].rallyeIds).toBeUndefined();
    expect(screen.queryByText('Rallyes zuordnen')).not.toBeInTheDocument();
  });

  it('offers task-oriented question type cards', () => {
    render(
      <QuestionForm onSubmit={vi.fn()} onCancel={vi.fn()} categories={[]} />
    );

    expect(
      screen.getByRole('radiogroup', {
        name: /Was sollen die Teilnehmenden tun/,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: /Antwort eingeben/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: /Antwort auswählen/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: /Bild ansehen und antworten/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: /QR-Code finden/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: /Foto hochladen/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: /Geocaching-Frage.*Zielort finden/ })
    ).toBeInTheDocument();
    for (const title of [
      'Wissensfrage',
      'Multiple Choice',
      'Bild',
      'QR Code',
      'Upload',
      'Geocaching-Frage',
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(screen.getByLabelText('Frage*')).toBeInTheDocument();
    expect(screen.queryByLabelText('Punkte')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Hinweis')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Kategorie')).not.toBeInTheDocument();
    expect(screen.queryByText('Fragetyp wählen')).not.toBeInTheDocument();
  });

  it('shows the matching fields after selecting a task', () => {
    render(
      <QuestionForm onSubmit={vi.fn()} onCancel={vi.fn()} categories={[]} />
    );

    const knowledgeType = screen.getByRole('radio', {
      name: /Antwort eingeben/,
    });
    fireEvent.click(knowledgeType);

    expect(knowledgeType).toBeChecked();
    expect(screen.getByLabelText('Punkte')).toBeInTheDocument();
    expect(screen.getByText('Antwort*')).toBeInTheDocument();
  });

  it('starts a new multiple-choice question with two empty solution options', () => {
    render(
      <QuestionForm onSubmit={vi.fn()} onCancel={vi.fn()} categories={[]} />
    );

    fireEvent.click(screen.getByRole('radio', { name: /Antwort auswählen/ }));

    const solutionOptionInputs =
      screen.getAllByPlaceholderText('Antwort eingeben');
    expect(solutionOptionInputs).toHaveLength(2);
    expect(solutionOptionInputs[0]).toHaveValue('');
    expect(solutionOptionInputs[1]).toHaveValue('');
  });

  it('resets solution options when changing to multiple choice', () => {
    render(
      <QuestionForm onSubmit={vi.fn()} onCancel={vi.fn()} categories={[]} />
    );

    fireEvent.click(screen.getByRole('radio', { name: /Antwort eingeben/ }));
    fireEvent.change(screen.getByPlaceholderText('Antwort eingeben'), {
      target: { value: 'Bestehende Lösung' },
    });
    fireEvent.click(screen.getByRole('radio', { name: /Antwort auswählen/ }));

    const solutionOptionInputs =
      screen.getAllByPlaceholderText('Antwort eingeben');
    expect(solutionOptionInputs).toHaveLength(2);
    expect(solutionOptionInputs[0]).toHaveValue('');
    expect(solutionOptionInputs[1]).toHaveValue('');
  });

  it('keeps one solution option when changing from multiple choice', () => {
    render(
      <QuestionForm onSubmit={vi.fn()} onCancel={vi.fn()} categories={[]} />
    );

    fireEvent.click(screen.getByRole('radio', { name: /Antwort auswählen/ }));
    fireEvent.click(screen.getByRole('radio', { name: /Antwort eingeben/ }));

    expect(screen.getAllByPlaceholderText('Antwort eingeben')).toHaveLength(1);
  });

  it('structures the editor and keeps further details collapsed', () => {
    render(
      <QuestionForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={['Campus']}
        initialData={{
          content: 'Wo ist die Mensa?',
          type: 'knowledge',
          point_value: 5,
          hint: 'Folgt den Schildern.',
          solutionOptions: [{ id: 1, correct: true, text: 'Gebäude A' }],
        }}
      />
    );

    expect(
      screen.getByRole('heading', { name: 'Fragetyp' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Frage formulieren' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Lösung festlegen' })
    ).toBeInTheDocument();

    const summary = screen.getByText('Weitere Angaben');
    const details = summary.closest('details');
    expect(details).not.toHaveAttribute('open');
    expect(screen.getByText('2 Angaben ausgefüllt')).toBeInTheDocument();

    fireEvent.click(summary.closest('summary')!);
    expect(details).toHaveAttribute('open');
  });

  it('keeps the image field outside the optional details', () => {
    render(
      <QuestionForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={[]}
        initialData={{
          content: 'Welches Gebäude ist zu sehen?',
          type: 'picture',
          solutionOptions: [{ id: 1, correct: true, text: 'Gebäude A' }],
        }}
      />
    );

    const details = screen.getByText('Weitere Angaben').closest('details');
    const imageLabel = screen
      .getAllByText('Bild')
      .find((element) => element.tagName === 'LABEL')!;
    expect(details).not.toContainElement(imageLabel);
  });

  it('requires an image before submitting a picture question', () => {
    const handleSubmit = vi.fn();
    render(
      <QuestionForm
        onSubmit={handleSubmit}
        onCancel={vi.fn()}
        categories={[]}
        initialData={{
          content: 'Welches Gebäude ist zu sehen?',
          type: 'picture',
          solutionOptions: [{ correct: true, text: 'Gebäude A' }],
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(handleSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Bitte ein Bild hochladen')).toBeInTheDocument();
  });

  it('opens further details when an optional field is invalid', () => {
    render(
      <QuestionForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={[]}
        initialData={{
          content: 'Wo ist die Mensa?',
          type: 'knowledge',
          point_value: -1,
          solutionOptions: [{ id: 1, correct: true, text: 'Gebäude A' }],
        }}
      />
    );

    const details = screen.getByText('Weitere Angaben').closest('details');
    expect(details).not.toHaveAttribute('open');

    fireEvent.submit(
      screen.getByRole('button', { name: 'Speichern' }).closest('form')!
    );

    expect(details).toHaveAttribute('open');
    expect(
      screen.getByText('Punkte müssen größer oder gleich 0 sein')
    ).toBeInTheDocument();
  });

  it('configures the point value input for integers', () => {
    render(
      <QuestionForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={[]}
        initialData={{
          content: 'Wo ist die Mensa?',
          type: 'knowledge',
          solutionOptions: [{ id: 1, correct: true, text: 'Gebäude A' }],
        }}
      />
    );

    fireEvent.click(screen.getByText('Weitere Angaben').closest('summary')!);

    expect(screen.getByLabelText('Punkte')).toHaveAttribute('step', '1');
    expect(screen.getByLabelText('Punkte')).toHaveAttribute(
      'inputmode',
      'numeric'
    );
  });

  it('rejects a decimal point value with a clear message', () => {
    const handleSubmit = vi.fn();
    render(
      <QuestionForm
        onSubmit={handleSubmit}
        onCancel={vi.fn()}
        categories={[]}
        initialData={{
          content: 'Wo ist die Mensa?',
          type: 'knowledge',
          solutionOptions: [{ id: 1, correct: true, text: 'Gebäude A' }],
        }}
      />
    );

    fireEvent.click(screen.getByText('Weitere Angaben').closest('summary')!);
    fireEvent.change(screen.getByLabelText('Punkte'), {
      target: { value: '2.5' },
    });
    fireEvent.submit(
      screen.getByRole('button', { name: 'Speichern' }).closest('form')!
    );

    expect(handleSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText('Punktwert muss eine ganze Zahl sein')
    ).toBeInTheDocument();
  });

  it('allows clearing points and submits them as unset', () => {
    const handleSubmit = vi.fn();

    render(
      <QuestionForm
        onSubmit={handleSubmit}
        onCancel={vi.fn()}
        categories={[]}
        initialData={{
          content: 'Wo ist die Mensa?',
          type: 'knowledge',
          point_value: 5,
          solutionOptions: [{ id: 1, correct: true, text: 'Gebäude A' }],
        }}
      />
    );

    fireEvent.click(screen.getByText('Weitere Angaben').closest('summary')!);
    const pointsInput = screen.getByLabelText('Punkte');
    fireEvent.change(pointsInput, { target: { value: '' } });

    expect(pointsInput).toHaveDisplayValue('');

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit.mock.calls[0][0].point_value).toBeUndefined();
  });

  it('counts explicitly set zero points as a filled detail', () => {
    render(
      <QuestionForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={[]}
        initialData={{
          content: 'Wo ist die Mensa?',
          type: 'knowledge',
          point_value: 0,
          solutionOptions: [{ id: 1, correct: true, text: 'Gebäude A' }],
        }}
      />
    );

    expect(screen.getByText('1 Angabe ausgefüllt')).toBeInTheDocument();
  });

  it('shows the question type as a compact read-only row when editing', () => {
    render(
      <QuestionForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={[]}
        initialData={{
          id: 1,
          content: 'X',
          type: 'knowledge',
          solutionOptions: [{ id: 1, correct: true, text: 'Antwort' }],
        }}
      />
    );

    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    expect(screen.getByText('Wissensfrage')).toBeInTheDocument();
    expect(
      screen.getByText('Teams geben eine kurze Lösung als Text ein.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Multiple Choice')).not.toBeInTheDocument();
    expect(
      screen.getByText(
        'Der Fragetyp kann nach dem Erstellen nicht geändert werden.'
      )
    ).toBeInTheDocument();
  });

  it('shows the relevant fields once a type is set', () => {
    render(
      <QuestionForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={[]}
        initialData={{
          id: 1,
          content: 'X',
          type: 'knowledge',
          solutionOptions: [],
        }}
      />
    );
    expect(screen.getByLabelText('Punkte')).toBeInTheDocument();
    expect(screen.getByLabelText('Hinweis')).toBeInTheDocument();
    expect(screen.queryByText('Rallyes zuordnen')).not.toBeInTheDocument();
  });

  it('disables removing the only solution option', () => {
    render(
      <QuestionForm
        initialData={{
          id: 1,
          content: 'Beispielfrage',
          type: 'multiple_choice',
          solutionOptions: [{ id: 1, correct: true, text: 'Antwort A' }],
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={[]}
      />
    );

    expect(
      screen.getByRole('button', { name: 'Antwort entfernen' })
    ).toBeDisabled();
  });

  it('reassigns the correct answer when removing the selected one', () => {
    render(
      <QuestionForm
        initialData={{
          content: 'Mehrfachauswahl',
          type: 'multiple_choice',
          solutionOptions: [
            { id: 1, correct: false, text: 'Antwort A' },
            { id: 2, correct: true, text: 'Antwort B' },
            { id: 3, correct: false, text: 'Antwort C' },
          ],
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={[]}
      />
    );

    const removeButtons = screen.getAllByRole('button', {
      name: 'Antwort entfernen',
    });
    fireEvent.click(removeButtons[1]);

    const radios = within(
      screen.getByRole('radiogroup', { name: 'Richtige Antwort' })
    ).getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(radios[1]).toHaveAttribute('data-checked');
  });

  it('requires at least two answers for multiple choice', () => {
    const handleSubmit = vi.fn();

    render(
      <QuestionForm
        initialData={{
          content: 'Mehrfachauswahl',
          type: 'multiple_choice',
          solutionOptions: [{ id: 1, correct: true, text: 'Antwort A' }],
        }}
        onSubmit={handleSubmit}
        onCancel={vi.fn()}
        categories={[]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(handleSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText('Mindestens zwei Antworten müssen eingegeben werden')
    ).toBeInTheDocument();
  });

  it('requires unique answers for multiple choice', () => {
    const handleSubmit = vi.fn();

    render(
      <QuestionForm
        initialData={{
          content: 'Mehrfachauswahl',
          type: 'multiple_choice',
          solutionOptions: [
            { id: 1, correct: true, text: 'Antwort A' },
            { id: 2, correct: false, text: 'Antwort A' },
          ],
        }}
        onSubmit={handleSubmit}
        onCancel={vi.fn()}
        categories={[]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(handleSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText('Antworten müssen unterschiedlich sein')
    ).toBeInTheDocument();
  });

  it('strips placeholder answer ids before submit', () => {
    const handleSubmit = vi.fn();

    render(
      <QuestionForm
        initialData={{
          content: 'Mehrfachauswahl',
          type: 'multiple_choice',
          solutionOptions: [{ id: 1, correct: true, text: 'Antwort A' }],
        }}
        onSubmit={handleSubmit}
        onCancel={vi.fn()}
        categories={[]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Antwort hinzufügen' }));
    const answerInputs = screen.getAllByPlaceholderText(/Antwort/i);
    fireEvent.change(answerInputs[1], { target: { value: 'Antwort B' } });
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    const submitted = handleSubmit.mock.calls[0][0] as QuestionFormData;
    const submittedAnswers: SolutionOption[] = submitted.solutionOptions ?? [];
    expect(submittedAnswers).toHaveLength(2);
    expect(submittedAnswers.some((answer) => answer.id === 0)).toBe(false);
    expect(submittedAnswers.some((answer) => answer.id === 1)).toBe(true);
  });

  it('reports dirty state changes', () => {
    const handleDirtyChange = vi.fn();

    render(
      <QuestionForm
        initialData={{
          content: 'Beispielfrage',
          type: 'knowledge',
          solutionOptions: [{ id: 1, correct: true, text: 'Antwort' }],
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        onDirtyChange={handleDirtyChange}
        categories={[]}
      />
    );

    const questionInput = screen.getByLabelText('Frage*');
    fireEvent.change(questionInput, { target: { value: 'Neue Frage' } });

    expect(handleDirtyChange).toHaveBeenCalledWith(true);

    fireEvent.change(questionInput, { target: { value: 'Beispielfrage' } });

    expect(handleDirtyChange).toHaveBeenLastCalledWith(false);
  });

  it('initializes, validates and submits a geocaching question', () => {
    const handleSubmit = vi.fn();
    render(
      <QuestionForm
        onSubmit={handleSubmit}
        onCancel={vi.fn()}
        categories={[]}
      />
    );

    fireEvent.click(
      screen.getByRole('radio', { name: /Geocaching-Frage.*Zielort finden/ })
    );

    expect(screen.getByTestId('geocaching-location-field')).toBeInTheDocument();
    expect(screen.getByLabelText('Test-Radius')).toHaveValue('10');
    expect(
      screen.getByRole('button', { name: 'Text eingeben' })
    ).toHaveAttribute('data-pressed');
    expect(
      screen.getByText(/Groß-\/Kleinschreibung sowie Leerzeichen/)
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Frage*'), {
      target: { value: 'Finde den Eingang' },
    });
    fireEvent.change(screen.getByPlaceholderText('Antwort eingeben'), {
      target: { value: 'Gebäude A' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(handleSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText('Bitte geben Sie einen gültigen Breitengrad ein')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Bitte geben Sie einen gültigen Längengrad ein')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Kartenziel setzen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(handleSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'geocaching',
        geocaching: {
          target_latitude: 47.123456,
          target_longitude: 7.123456,
          proximity_radius: 10,
          input_type: 'text',
        },
        solutionOptions: [
          expect.objectContaining({ correct: true, text: 'Gebäude A' }),
        ],
      })
    );
    expect(
      screen.getByText(
        /Ziel bei 47\.123456, 7\.123456 · freigeschaltet innerhalb von 10 m/
      )
    ).toBeInTheDocument();
  });

  it('preserves one solution when switching to geocaching and changing input mode', () => {
    const handleSubmit = vi.fn();
    render(
      <QuestionForm
        initialData={{
          content: 'Auswahl',
          type: 'multiple_choice',
          solutionOptions: [
            { correct: false, text: 'Erste Lösung' },
            { correct: true, text: 'Zweite Lösung' },
          ],
        }}
        onSubmit={handleSubmit}
        onCancel={vi.fn()}
        categories={[]}
      />
    );

    fireEvent.click(
      screen.getByRole('radio', { name: /Geocaching-Frage.*Zielort finden/ })
    );
    expect(screen.getAllByPlaceholderText('Antwort eingeben')).toHaveLength(1);
    expect(screen.getByPlaceholderText('Antwort eingeben')).toHaveValue(
      'Zweite Lösung'
    );

    fireEvent.click(screen.getByRole('button', { name: 'QR-Code scannen' }));
    expect(screen.getByPlaceholderText('Antwort eingeben')).toHaveValue(
      'Zweite Lösung'
    );
    expect(
      screen.getByText(
        'Ein falscher QR-Code wird abgelehnt und kann erneut gescannt werden.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'QR-Code generieren' })
    ).toBeInTheDocument();
  });

  it('loads and canonicalizes malformed existing geocaching data', () => {
    render(
      <QuestionForm
        initialData={{
          id: 4,
          content: 'Legacy',
          type: 'geocaching',
          geocaching: {
            target_latitude: 48,
            target_longitude: 9,
            proximity_radius: 25,
            input_type: 'qr',
          },
          solutionOptions: [
            { correct: false, text: 'Fallback' },
            { correct: true, text: 'Bevorzugt' },
            { correct: true, text: 'Ignoriert' },
          ],
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={[]}
      />
    );

    expect(screen.getByLabelText('Test-Radius')).toHaveValue('25');
    expect(screen.getAllByPlaceholderText('Antwort eingeben')).toHaveLength(1);
    expect(screen.getByPlaceholderText('Antwort eingeben')).toHaveValue(
      'Bevorzugt'
    );
  });

  it('shows and clears server target issues when the target changes', () => {
    const clear = vi.fn();
    render(
      <QuestionForm
        initialData={{ content: 'Ziel', type: 'geocaching' }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={[]}
        serverErrors={{
          'geocaching.target_latitude': 'Server-Breitengradfehler',
        }}
        onServerErrorClear={clear}
      />
    );

    expect(screen.getByText('Server-Breitengradfehler')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Kartenziel setzen' }));
    expect(clear).toHaveBeenCalledWith('geocaching.target_latitude');
  });

  it('does not submit the preceding valid target after a numeric draft is cleared', () => {
    const handleSubmit = vi.fn();
    render(
      <QuestionForm
        initialData={{
          content: 'Ziel',
          type: 'geocaching',
          geocaching: {
            target_latitude: 47,
            target_longitude: 7,
            proximity_radius: 10,
            input_type: 'text',
          },
          solutionOptions: [{ correct: true, text: 'Eingang' }],
        }}
        onSubmit={handleSubmit}
        onCancel={vi.fn()}
        categories={[]}
      />
    );

    fireEvent.change(screen.getByLabelText('Test-Breitengrad'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('Test-Radius'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(handleSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText('Bitte geben Sie einen gültigen Breitengrad ein')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Bitte geben Sie einen gültigen Näherungsradius ein')
    ).toBeInTheDocument();
  });

  it('opens a repairable target draft when the side-table row is missing', () => {
    render(
      <QuestionForm
        initialData={{
          id: 7,
          content: 'Legacy-Ziel',
          type: 'geocaching',
          solutionOptions: [],
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={[]}
      />
    );

    expect(screen.getByTestId('geocaching-location-field')).toBeInTheDocument();
    expect(screen.getByLabelText('Test-Breitengrad')).toHaveValue('');
    expect(screen.getByLabelText('Test-Radius')).toHaveValue('10');
    expect(screen.getAllByPlaceholderText('Antwort eingeben')).toHaveLength(1);
  });

  it('removes stale geocaching configuration after switching away', () => {
    const handleSubmit = vi.fn();
    render(
      <QuestionForm
        initialData={{
          content: 'Neues Ziel',
          type: 'geocaching',
          geocaching: {
            target_latitude: 47,
            target_longitude: 7,
            proximity_radius: 10,
            input_type: 'text',
          },
          solutionOptions: [{ correct: true, text: 'Eingang' }],
        }}
        onSubmit={handleSubmit}
        onCancel={vi.fn()}
        categories={[]}
      />
    );

    fireEvent.click(screen.getByRole('radio', { name: /Wissensfrage/ }));
    expect(
      screen.queryByTestId('geocaching-location-field')
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(handleSubmit.mock.calls[0][0].geocaching).toBeUndefined();
  });

  it('shows QR operational warnings only while editing', () => {
    const { unmount } = render(
      <QuestionForm
        initialData={{
          id: 9,
          content: 'QR-Ziel',
          type: 'geocaching',
          geocaching: {
            target_latitude: 47,
            target_longitude: 7,
            proximity_radius: 10,
            input_type: 'qr',
          },
          solutionOptions: [{ correct: true, text: 'alter-code' }],
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={[]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Text eingeben' }));
    expect(screen.getByText(/Zuvor gedruckte QR-Codes/)).toBeInTheDocument();

    unmount();
    render(
      <QuestionForm
        initialData={{
          id: 10,
          content: 'Text-Ziel',
          type: 'geocaching',
          geocaching: {
            target_latitude: 47,
            target_longitude: 7,
            proximity_radius: 10,
            input_type: 'text',
          },
          solutionOptions: [{ correct: true, text: 'Eingang' }],
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={[]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'QR-Code scannen' }));
    expect(
      screen.getByText(
        /Erstellen, drucken und platzieren Sie den neuen QR-Code/
      )
    ).toBeInTheDocument();
  });

  it('warns when an edited QR solution changes and tracks target changes as dirty', () => {
    const dirty = vi.fn();
    render(
      <QuestionForm
        initialData={{
          id: 11,
          content: 'QR-Ziel',
          type: 'geocaching',
          geocaching: {
            target_latitude: 48,
            target_longitude: 9,
            proximity_radius: 10,
            input_type: 'qr',
          },
          solutionOptions: [{ correct: true, text: 'alter-code' }],
        }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        onDirtyChange={dirty}
        categories={[]}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Antwort eingeben'), {
      target: { value: 'neuer-code' },
    });
    expect(
      screen.getByText(/neu generiert und ausgedruckt/)
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Kartenziel setzen' }));
    expect(dirty).toHaveBeenCalledWith(true);
  });

  it('explains geocaching point handling in Campus tours', () => {
    render(
      <QuestionForm
        initialData={{ content: 'Ziel', type: 'geocaching' }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={[]}
      />
    );

    fireEvent.click(screen.getByText('Weitere Angaben').closest('summary')!);
    expect(
      screen.getByText(
        'Der Punktwert wird bei einer richtigen Antwort vergeben. In Campus-Touren wird er lokal gezählt und am Ende angezeigt.'
      )
    ).toBeInTheDocument();
  });

  it('explains how the point value affects the team rallye result', () => {
    render(
      <QuestionForm
        initialData={{ content: 'Frage', type: 'knowledge' }}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        categories={[]}
      />
    );

    fireEvent.click(screen.getByText('Weitere Angaben').closest('summary')!);

    expect(screen.getByLabelText('Punkte')).toHaveAttribute(
      'aria-describedby',
      'point-value-help'
    );
    expect(
      screen.getByText(
        'Zählt zum Ergebnis der Team-Rallye. Leer bedeutet: keine Team-Punkte.'
      )
    ).toBeInTheDocument();
  });
});
