import createClient from '@/lib/supabase';
import DepartmentsClient from '@/components/DepartmentsClient';

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

  // Create a map of organization names
  const organizationNames = new Map<number, string>();
  if (organizationOptions) {
    organizationOptions.forEach(org => {
      organizationNames.set(org.id, org.name);
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
    />
  );
}