import {
  BooleanField,
  Datagrid,
  DateField,
  EmailField,
  List,
  SelectField,
  TextField,
} from "react-admin";
import { rallyeStatus } from "./helpers";

export const RallyeList = () => (
  <List exporter={false}>
    <Datagrid rowClick="edit" bulkActionButtons={false}>
      <TextField source="id" />
      <TextField source="name" />
      <BooleanField source="is_active_rallye" label="Aktiv" />
      <SelectField source="status" label="Status" choices={rallyeStatus} />
      <DateField source="end_time" label="Endzeitpunkt" showTime />
      <EmailField source="mail_adress" label="E-Mail" />
      <DateField source="created_at" label="Erstellt am" />
    </Datagrid>
  </List>
);
