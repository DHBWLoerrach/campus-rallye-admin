import {
  BooleanField,
  Datagrid,
  List,
  ReferenceField,
  TextField,
} from "react-admin";

export const RallyeGroup = () => (
  <List exporter={false} sort={{ field: "rallye_id", order: "DESC" }}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <TextField source="name" />
      <ReferenceField source="rallye_id" reference="rallye" label="Rallye" />
      <BooleanField source="used" label="Aktiv" />
    </Datagrid>
  </List>
);
