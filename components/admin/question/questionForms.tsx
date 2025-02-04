import {
  BooleanInput,
  Create,
  Edit,
  ReferenceInput,
  SelectInput,
  SimpleForm,
  TextInput,
  required,
  useRecordContext,
} from 'react-admin';
import { useWatch } from 'react-hook-form';
import { questionTypes } from './helpers';
import { useState, useEffect } from 'react';
import {
  getChildren,
  saveQuestions,
} from '@/actions/multipleChoiceAnswers';

// TODO: should we leave image url when type is changed?
const ImageURLInput = () => {
  const questionType = useWatch({ name: 'question_type' });
  return questionType === 'picture' ? (
    <TextInput source="uri" label="Bildquelle" />
  ) : null;
};

// TODO: should we leave question reference when type is changed?
// maybe prevent changing of type? --> delete and create new question

const MultipleChoiceInput = () => {
  const questionType = useWatch({ name: 'question_type' });
  const [answers, setAnswers] = useState<string[]>(['']);
  const record = useRecordContext();

  const addAnswer = () => {
    setAnswers([...answers, '']);
  };

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    if (
      typeof newAnswers[index] === 'object' &&
      newAnswers[index] !== null
    ) {
      newAnswers[index] = Object.assign(newAnswers[index], {
        answer: value,
      });
    } else {
      newAnswers[index] = value;
    }
    setAnswers(newAnswers);
  };

  const removeAnswer = (index: number) => {
    const newAnswers = answers.filter((_, i) => i !== index);
    setAnswers(newAnswers);
  };

  //

  // if (!record) {
  //   console.log("Record is null");
  //   return;
  // } else {
  //   console.log("Record ", record);
  //   getChildren(record.id).then((data) => {
  //     if (data) {
  //       // console.log("Data ", data);
  //       setAnswers(data.map((item: any) => item.answer || ''));
  //       console.log(answers)
  //     }
  //   });

  //   // wenn parent id null dann ists die frage sonst soll er zurück gehen weil falsch
  //   // daten laden
  //   // neue create ausfürhren oder update
  // }
  useEffect(() => {
    if (record) {
      // console.log("Record ", record);
      getChildren(record.id).then((data) => {
        if (data) {
          setAnswers(data.map((item: any) => item || ''));
        }
      });
    } else {
      console.log('Record is null');
    }
  }, [record]);

  const saveAnswers = () => {
    saveQuestions(answers, record);
  };

  return questionType === 'multiple_choice' && record?.question ? (
    <>
      <div>
        {answers.map((answer, index) => (
          <div
            key={index}
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <label>{`Antwort ${index + 1}:`}</label>
            <input
              // label={`Antwort ${index + 1}`}
              type="text"
              value={answer}
              onChange={(e) =>
                handleAnswerChange(index, e.target.value)
              }
              style={{
                background: 'white',
                flex: 1,
                width: '100%',
                marginLeft: '8px',
              }}
            />
            <button
              style={{ marginLeft: '8px' }}
              type="button"
              onClick={() => removeAnswer(index)}
            >
              -
            </button>
          </div>
        ))}
        <button
          style={{ marginTop: '8px' }}
          type="button"
          onClick={addAnswer}
        >
          + Weitere Antwort
        </button>
        <div></div>
        <button
          style={{ marginTop: '8px', marginBottom: '8px' }}
          type="button"
          onClick={saveAnswers}
        >
          Antworten Speichern
        </button>
      </div>
    </>
  ) : null;
};

const QuestionForm = () => (
  <SimpleForm>
    <TextInput source="question" label="Frage" multiline rows={5} />
    <TextInput source="answer" label="Antwort" multiline rows={5} />
    <SelectInput
      source="question_type"
      label="Typ"
      choices={questionTypes}
      validate={required()}
      helperText="TODO: hier müssten wir vielleicht erklären, was die einzelnen Typen bedeuten"
    />
    <BooleanInput source="enabled" label="Aktiv" />
    <SelectInput
      source="points"
      label="Punkte"
      choices={Array.from({ length: 20 }, (_, k) => ({
        id: k + 1,
        name: `${k + 1}`,
      }))}
    />
    <MultipleChoiceInput />
    <ImageURLInput />
    <ReferenceInput source="category" reference="question_category">
      <SelectInput
        label="Studienbereich (Kategorie)"
        validate={required()}
      />
    </ReferenceInput>
  </SimpleForm>
);

export const QuestionEdit = () => {
  return (
    <Edit mutationMode="pessimistic">
      <QuestionForm />
    </Edit>
  );
};

export const QuestionCreate = () => {
  return (
    <Create>
      <QuestionForm />
    </Create>
  );
};
