import { redirect } from 'next/navigation';
import createClient from '@/lib/supabase';
import { requireAdmin } from '@/lib/require-profile';
import { listLocalUsers } from '@/lib/db/local-user';
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
    .from('departments')
    .select('id, name, created_at, location_id')
    .order('name');

  // Load location options
  const { data: locationOptions } = await supabase
    .from('locations')
    .select('id, name')
    .order('name');

  // Load rallye options
  const { data: rallyeOptions } = await supabase
    .from('rallyes')
    .select('id, name')
    .order('name');

  // Create a map of location names
  const locationNames = new Map<number, string>();
  if (locationOptions) {
    locationOptions.forEach((org) => {
      locationNames.set(org.id, org.name);
    });
  }

  // Load all rallye assignments in a single query and group by department.
  const rallyeAssignmentsMap = new Map<number, number[]>();
  if (departments && departments.length > 0) {
    const departmentIds = departments.map((dept) => dept.id);
    const { data: assignmentRows } = await supabase
      .from('rallyes')
      .select('id, department_id')
      .in('department_id', departmentIds);

    departments.forEach((dept) => {
      rallyeAssignmentsMap.set(dept.id, []);
    });

    for (const row of assignmentRows || []) {
      const departmentId = (row as { department_id: number }).department_id;
      const rallyeId = (row as { id: number }).id;
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

  // Count local users per department for the delete-warning in the UI.
  const userCountByDepartment = new Map<number, number>();
  for (const user of listLocalUsers()) {
    if (user.department_id !== null) {
      userCountByDepartment.set(
        user.department_id,
        (userCountByDepartment.get(user.department_id) || 0) + 1
      );
    }
  }

  return (
    <DepartmentsClient
      departments={departments || []}
      locationOptions={locationOptions || []}
      locationNames={locationNames}
      rallyeOptions={rallyeOptions || []}
      rallyeAssignmentsMap={rallyeAssignmentsMap}
      userCountByDepartment={userCountByDepartment}
    />
  );
}
