import {
  BooleanField,
  BooleanInput,
  Datagrid,
  ImageField,
  List,
  NumberField,
  ReferenceField,
  ReferenceInput,
  SelectField,
  SelectInput,
  TextField,
  TextInput,
  useRecordContext,
} from 'react-admin';
import { questionTypes } from '../../../helpers/questionTypes';
import TruncatedField from '@/components/admin/TruncatedField';

const truncateLength = 50;

const QuestionPanel = () => {
  const record = useRecordContext();
  return record.question;
};

const questionFilters = [
  <TextInput
    label="Suche (Frage)"
    source="question@ilike"
    alwaysOn
  />,
  <TextInput
    label="Suche (Antwort)"
    source="answer@ilike"
    alwaysOn
  />,
  <SelectInput
    label="Typ"
    source="question_type"
    choices={questionTypes}
    alwaysOn
  />,
  <ReferenceInput
    source="category"
    reference="question_category"
    alwaysOn
  >
    <SelectInput label="Studienbereich (Kategorie)" />
  </ReferenceInput>,
  <BooleanInput
    label="Nur aktive Fragen"
    source="enabled"
    alwaysOn
    sx={{ paddingBottom: '1em' }}
  />,
];

export const QuestionList = () => (
  <List filters={questionFilters} exporter={false} perPage={50}>
    <Datagrid
      rowClick="edit"
      bulkActionButtons={false}
      expand={<QuestionPanel />}
      isRowExpandable={(row) => row.question?.length > truncateLength}
    >
      <TruncatedField
        source="question"
        label="Frage"
        maxLength={truncateLength}
      />
      <TextField source="answer" label="Antwort" />
      <SelectField
        source="question_type"
        label="Typ"
        choices={questionTypes}
      />
      <BooleanField source="enabled" label="Aktiv" />
      <NumberField source="points" label="Punkte" />
      <ImageField source="uri" label="Bild" />
      <ReferenceField
        source="category"
        reference="question_category"
        label="Studienbereich (Kategorie)"
      />
      <ReferenceField
        source="parent_id"
        reference="question"
        label="Multiple Choice Frage"
      />
    </Datagrid>
  </List>
);
