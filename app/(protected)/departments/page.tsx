import createClient from '@/lib/supabase';
import DepartmentsClient from '@/components/DepartmentsClient';
import { getRallyeAssignmentsByDepartment } from '@/actions/department';

export default async function DepartmentsPage() {
  const supabase = await createClient();
  
  // Load departments
  const { data: departments } = await supabase
    .from('department')
    .select('id, name, created_at, organization_id')
    .order('name');
  
  // Load organization options
  const { data: organizationOptions } = await supabase
    .from('organization')
    .select('id, name')
    .order('name');

  // Load rallye options
  const { data: rallyeOptions } = await supabase
    .from('rallye')
    .select('id, name')
    .order('name');

  // Create a map of organization names
  const organizationNames = new Map<number, string>();
  if (organizationOptions) {
    organizationOptions.forEach(org => {
      organizationNames.set(org.id, org.name);
    });
  }

  // Load rallye assignments per department
  const rallyeAssignmentsMap = new Map<number, number[]>();
  if (departments) {
    const results = await Promise.all(
      departments.map((dept) => getRallyeAssignmentsByDepartment(dept.id))
    );
    departments.forEach((dept, index) => {
      const result = results[index];
      rallyeAssignmentsMap.set(
        dept.id,
        result.success && result.data ? result.data : []
      );
    });
  }

  // Sort departments manually (supabase can't sort ignoring case)
  if (departments) {
    departments.sort((a, b) =>
      a.name.localeCompare(b.name, 'de', { sensitivity: 'base' })
    );
  }

  return (
    <DepartmentsClient
      departments={departments || []}
      organizationOptions={organizationOptions || []}
      organizationNames={organizationNames}
      rallyeOptions={rallyeOptions || []}
      rallyeAssignmentsMap={rallyeAssignmentsMap}
    />
  );
}