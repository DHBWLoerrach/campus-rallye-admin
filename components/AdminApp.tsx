'use client';
import {
  Admin,
  Resource,
  ListGuesser,
  EditGuesser,
  fetchUtils,
} from 'react-admin';
import postgrestRestProvider, {
  IDataProviderConfig,
  defaultPrimaryKeys,
  defaultSchema,
} from '@raphiniert/ra-data-postgrest';

const config: IDataProviderConfig = {
  apiUrl: '/api/admin',
  httpClient: fetchUtils.fetchJson,
  defaultListOp: 'eq',
  primaryKeys: defaultPrimaryKeys,
  schema: defaultSchema,
};

const dataProvider = postgrestRestProvider(config);

const AdminApp = () => (
  <Admin dataProvider={dataProvider}>
    <Resource
      name="rallye"
      list={ListGuesser}
      edit={EditGuesser}
      recordRepresentation="name"
    />
  </Admin>
);

export default AdminApp;
