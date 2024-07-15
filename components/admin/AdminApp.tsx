'use client';

import {
  defaultTheme,
  Admin,
  Resource,
  fetchUtils,
} from 'react-admin';
import postgrestRestProvider, {
  IDataProviderConfig,
  defaultPrimaryKeys,
  defaultSchema,
} from '@raphiniert/ra-data-postgrest';
import { i18nProvider } from '@/lib/i18n/i18nProvider';
import { QuestionList } from '@/components/admin/question/questions';
import {
  QuestionEdit,
  QuestionCreate,
} from '@/components/admin/question/questionForms';
import { RallyeList } from '@/components/admin/rallye/rallye';
import {
  RallyeEdit,
  RallyeCreate,
} from '@/components/admin/rallye/rallyeForms';
import { RallyeGroup } from '@/components/admin/rallye/rallyeGroup';
import {
  RallyeGroupEdit,
  RallyeGroupCreate,
} from '@/components/admin/rallye/rallyeGroupForms';

const config: IDataProviderConfig = {
  apiUrl: '/api/admin',
  httpClient: fetchUtils.fetchJson,
  defaultListOp: 'eq',
  primaryKeys: defaultPrimaryKeys,
  schema: defaultSchema,
};

const dataProvider = postgrestRestProvider(config);

const dhbwTheme = {
  ...defaultTheme,
  palette: {
    primary: { main: '#E2001A' },
    secondary: { main: '#D15353' },
  },
};

const AdminApp = () => (
  <Admin
    dataProvider={dataProvider}
    theme={dhbwTheme}
    i18nProvider={i18nProvider}
  >
    <Resource
      name="question"
      options={{ label: 'Fragen' }}
      list={QuestionList}
      edit={QuestionEdit}
      create={QuestionCreate}
      recordRepresentation={(record) => `${record.question}`}
    />
    <Resource
      name="question_category"
      recordRepresentation={(record) => `${record.category_name}`}
    />
    <Resource
      name="rallye"
      options={{ label: 'Rallye' }}
      list={RallyeList}
      edit={RallyeEdit}
      create={RallyeCreate}
    />
    <Resource
      name="rallye_group"
      options={{ label: 'Gruppen' }}
      list={RallyeGroup}
      edit={RallyeGroupEdit}
      create={RallyeGroupCreate}
      recordRepresentation={(record) => `${record.name}`}
    />
  </Admin>
);

export default AdminApp;
