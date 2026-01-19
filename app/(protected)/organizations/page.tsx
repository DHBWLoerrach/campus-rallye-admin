import { getOrganizationsWithDepartments } from '@/actions/organization';
import { getRallyes } from '@/actions/rallye';
import OrganizationsManagement from '@/components/organizations/OrganizationsManagement';

export default async function OrganizationsPage() {
  const organizations = await getOrganizationsWithDepartments();
  const rallyes = await getRallyes();

  return (
    <main className="flex flex-col m-4">
      <h1 className="text-2xl font-bold mb-4">Organisationen</h1>
      <OrganizationsManagement organizations={organizations} rallyes={rallyes} />
    </main>
  );
}
