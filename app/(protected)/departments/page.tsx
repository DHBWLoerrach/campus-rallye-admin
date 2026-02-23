import { redirect } from 'next/navigation';
import createClient from '@/lib/supabase';
import { requireAdmin } from '@/lib/require-profile';
import DepartmentsClient from '@/components/DepartmentsClient';

export default async function DepartmentsPage() {
  try {
    await requireAdmin();
  } catch {
    redirect('/rallyes');
  }

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
    organizationOptions.forEach((org) => {
      organizationNames.set(org.id, org.name);
    });
  }

  // Load all rallye assignments in a single query and group by department.
  const rallyeAssignmentsMap = new Map<number, number[]>();
  if (departments && departments.length > 0) {
    const departmentIds = departments.map((dept) => dept.id);
    const { data: assignmentRows } = await supabase
      .from('join_department_rallye')
      .select('department_id, rallye_id')
      .in('department_id', departmentIds);

    departments.forEach((dept) => {
      rallyeAssignmentsMap.set(dept.id, []);
    });

    for (const row of assignmentRows || []) {
      const departmentId = (row as { department_id: number }).department_id;
      const rallyeId = (row as { rallye_id: number }).rallye_id;
      const existing = rallyeAssignmentsMap.get(departmentId);
      if (existing) {
        existing.push(rallyeId);
      } else {
        rallyeAssignmentsMap.set(departmentId, [rallyeId]);
      }
    }
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
