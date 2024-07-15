import {
  BooleanInput,
  Create,
  DateTimeInput,
  Edit,
  SelectInput,
  SimpleForm,
  TextInput,
  required,
} from "react-admin";
import { rallyeStatus } from "./helpers";

const RallyeForm = ({ create = false }) => {
  const postDefaultValue = create
    ? {
        status: "preparation",
      }
    : null;
  return (
    <SimpleForm defaultValues={postDefaultValue}>
      <TextInput
        label="Name bzw. Beschreibung der Rallye"
        source="name"
        validate={required()}
      />
      <DateTimeInput
        source="end_time"
        label="Endzeitpunkt
      "
        validate={required()}
      />
      <SelectInput
        source="status"
        label="Status"
        choices={rallyeStatus}
        validate={required()}
      />
      <BooleanInput source="is_active_rallye" label="Aktiv" />
      <TextInput
        label="E-Mail für Fotos und Videos"
        source="mail_adress"
        type="email"
        validate={required()}
      />
    </SimpleForm>
  );
};

export const RallyeEdit = () => {
  return (
    <Edit mutationMode="pessimistic">
      <RallyeForm />
    </Edit>
  );
};

export const RallyeCreate = () => {
  return (
    <Create>
      <RallyeForm create={true} />
    </Create>
  );
};
