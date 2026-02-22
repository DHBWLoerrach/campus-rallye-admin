import createClient from '@/lib/supabase';
import Organization from '@/components/Organization';
import OrganizationDialog from '@/components/OrganizationDialog';
import { getRallyeOptionsByOrganization } from '@/actions/organization';

export default async function OrganizationsPage() {
  const supabase = await createClient();
  
  // Load organizations
  const { data: organizations } = await supabase
    .from('organization')
    .select('id, name, created_at, default_rallye_id')
    .order('name');

  // Load rallye options per organization (filtered by department assignments)
  const rallyeOptionsMap = new Map<number, { id: number; name: string }[]>();
  const defaultRallyeNames = new Map<number, string>();

  if (organizations) {
    const results = await Promise.all(
      organizations.map((org) => getRallyeOptionsByOrganization(org.id))
    );

    organizations.forEach((org, index) => {
      const result = results[index];
      const options = result.success && result.data ? result.data : [];
      rallyeOptionsMap.set(org.id, options);

      // Determine default rallye name from filtered options
      if (org.default_rallye_id) {
        const match = options.find((r) => r.id === org.default_rallye_id);
        if (match) {
          defaultRallyeNames.set(org.id, match.name);
        }
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
            Verwalten Sie Ihre Organisationen und deren Campus-Touren.
          </p>
        </div>
        <OrganizationDialog buttonStyle="ml-auto" />
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
              rallyeOptions={rallyeOptionsMap.get(organization.id) || []}
              defaultRallyeName={defaultRallyeNames.get(organization.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}