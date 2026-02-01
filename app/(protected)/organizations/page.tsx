import createClient from '@/lib/supabase';
import Organization from '@/components/Organization';
import OrganizationDialog from '@/components/OrganizationDialog';

export default async function OrganizationsPage() {
  const supabase = await createClient();
  
  // Load organizations
  const { data: organizations } = await supabase
    .from('organization')
    .select('id, name, created_at, default_rallye_id')
    .order('name');
  
  // Load rallye options for the dropdown
  const { data: rallyeOptions } = await supabase
    .from('rallye')
    .select('id, name')
    .order('name');

  // Create a map of default rallye names
  const defaultRallyeNames = new Map<number, string>();
  if (rallyeOptions && organizations) {
    const rallyeMap = new Map(rallyeOptions.map(r => [r.id, r.name]));
    organizations.forEach(org => {
      if (org.default_rallye_id && rallyeMap.has(org.default_rallye_id)) {
        defaultRallyeNames.set(org.id, rallyeMap.get(org.default_rallye_id)!);
      }
    });
  }

  // Sort organizations manually (supabase can't sort ignoring case)
  if (organizations) {
    organizations.sort((a, b) =>
      a.name.localeCompare(b.name, 'de', { sensitivity: 'base' })
    );
  }

  return (
    <div className="mx-auto w-full max-w-350 space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Organisationen</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Organisationen und deren Standard-Rallyes.
          </p>
        </div>
        <OrganizationDialog 
          buttonStyle="ml-auto"
          rallyeOptions={rallyeOptions || []}
        />
      </div>

      {!organizations || organizations.length === 0 ? (
        <div className="flex min-h-96 flex-col items-center justify-center space-y-2 rounded-md border border-dashed border-border/60 bg-muted/20 p-8 text-center">
          <h2 className="text-lg font-medium text-foreground">Keine Organisationen</h2>
          <p className="text-sm text-muted-foreground">
            Erstellen Sie Ihre erste Organisation, um zu beginnen.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {organizations.map((organization) => (
            <Organization
              key={organization.id}
              organization={organization}
              rallyeOptions={rallyeOptions || []}
              defaultRallyeName={defaultRallyeNames.get(organization.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}