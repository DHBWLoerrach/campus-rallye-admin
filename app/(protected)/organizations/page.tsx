import { redirect } from 'next/navigation';
import createClient from '@/lib/supabase';
import { requireAdmin } from '@/lib/require-profile';
import Organization from '@/components/Organization';
import OrganizationDialog from '@/components/OrganizationDialog';
import type { RallyeOption } from '@/lib/types';

export default async function OrganizationsPage() {
  try {
    await requireAdmin();
  } catch {
    redirect('/rallyes');
  }

  const supabase = await createClient();

  // Load organizations
  const { data: organizations } = await supabase
    .from('organization')
    .select('id, name, created_at, default_rallye_id')
    .order('name');

  // Load all department-rallye links in one query and group by organization.
  const { data: departmentRallyeRows } = await supabase
    .from('department')
    .select('organization_id, join_department_rallye(rallye(id, name))');

  const rallyeOptionsMap = new Map<number, RallyeOption[]>();
  const defaultRallyeNames = new Map<number, string>();
  const rallyeMapByOrganization = new Map<number, Map<number, string>>();
  const emptyRallyeMap = new Map<number, string>();

  for (const row of departmentRallyeRows || []) {
    const organizationId = (row as { organization_id: number }).organization_id;
    const joins = (row as Record<string, unknown>).join_department_rallye;

    let organizationRallyes = rallyeMapByOrganization.get(organizationId);
    if (!organizationRallyes) {
      organizationRallyes = new Map<number, string>();
      rallyeMapByOrganization.set(organizationId, organizationRallyes);
    }

    if (!Array.isArray(joins)) {
      continue;
    }

    for (const join of joins) {
      const rallyeValue = (join as Record<string, unknown>).rallye;
      const rallye = Array.isArray(rallyeValue) ? rallyeValue[0] : rallyeValue;
      if (
        rallye &&
        typeof rallye === 'object' &&
        'id' in rallye &&
        'name' in rallye &&
        typeof rallye.id === 'number' &&
        typeof rallye.name === 'string'
      ) {
        organizationRallyes.set(rallye.id, rallye.name);
      }
    }
  }

  if (organizations) {
    organizations.forEach((org) => {
      const rallyesForOrganization = rallyeMapByOrganization.get(org.id) || emptyRallyeMap;
      const options = Array.from(rallyesForOrganization.entries())
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }));

      rallyeOptionsMap.set(org.id, options);

      if (org.default_rallye_id) {
        const defaultRallyeName = rallyesForOrganization.get(org.default_rallye_id);
        if (defaultRallyeName) {
          defaultRallyeNames.set(org.id, defaultRallyeName);
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
