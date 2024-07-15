import {
  BooleanInput,
  Create,
  Edit,
  ReferenceInput,
  SelectInput,
  SimpleForm,
  TextInput,
  required,
} from "react-admin";

const RallyeGroupForm = ({ create = false }) => {
  const postDefaultValue = create
    ? {
        used: true,
      }
    : null;
  return (
    <SimpleForm defaultValues={postDefaultValue}>
      <TextInput label="Gruppenname" source="name" validate={required()} />
      <BooleanInput source="used" label="Aktiv" />
      <ReferenceInput source="rallye_id" reference="rallye">
        <SelectInput label="Rallye" validate={required()} />
      </ReferenceInput>
    </SimpleForm>
  );
};

export const RallyeGroupEdit = () => {
  return (
    <Edit mutationMode="pessimistic">
      <RallyeGroupForm />
    </Edit>
  );
};

export const RallyeGroupCreate = () => {
  return (
    <Create>
      <RallyeGroupForm create={true} />
    </Create>
  );
};
