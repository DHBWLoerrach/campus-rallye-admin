import {
  AutocompleteInput,
  BooleanInput,
  Create,
  Edit,
  ReferenceInput,
  SelectInput,
  SimpleForm,
  TextInput,
  required,
} from "react-admin";
import { useWatch } from "react-hook-form";
import { questionTypes } from "../../questions/helpers";

// TODO: should we leave image url when type is changed?
const ImageURLInput = () => {
  const questionType = useWatch({ name: "question_type" });
  return questionType === "picture" ? (
    <TextInput source="uri" label="Bildquelle" />
  ) : null;
};

// TODO: should we leave question reference when type is changed?
// maybe prevent changing of type? --> delete and create new question

const MultipleChoiceInput = () => {
  const questionType = useWatch({ name: "question_type" });
  return questionType === "multiple_choice" ? (
    <ReferenceInput source="parent_id" reference="question">
      <AutocompleteInput label="Multiple Choice Frage" />
    </ReferenceInput>
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
      <SelectInput label="Studienbereich (Kategorie)" validate={required()} />
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
