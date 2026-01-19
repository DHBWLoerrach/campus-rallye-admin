import { getDepartmentsWithRallyes } from '@/actions/department';
import { getOrganizations } from '@/actions/organization';
import { getRallyes } from '@/actions/rallye';
import DepartmentsManagement from '@/components/departments/DepartmentsManagement';

export default async function DepartmentsPage() {
  const departments = await getDepartmentsWithRallyes();
  const organizations = await getOrganizations();
  const rallyes = await getRallyes();

  return (
    <main className="flex flex-col m-4">
      <h1 className="text-2xl font-bold mb-4">Studiengänge / Abteilungen</h1>
      <DepartmentsManagement 
        departments={departments} 
        organizations={organizations}
        rallyes={rallyes}
      />
    </main>
  );
}
