import Link from 'next/link';
import { redirect } from 'next/navigation';
import createClient from '@/lib/supabase';
import { requireAdmin } from '@/lib/require-profile';
import Location from '@/components/Location';
import LocationDialog from '@/components/LocationDialog';
import { Button } from '@/components/ui/button';
import type { RallyeOption } from '@/lib/types';

export default async function LocationsPage() {
  try {
    await requireAdmin();
  } catch {
    redirect('/rallyes');
  }

  const supabase = await createClient();

  // Load locations
  const { data: locations } = await supabase
    .from('location')
    .select('id, name, created_at, default_rallye_id')
    .order('name');

  // Load rallyes with their department's location and group by location.
  const { data: rallyeRows } = await supabase
    .from('rallyes')
    .select('id, name, department:department_id(location_id)');

  const rallyeOptionsMap = new Map<number, RallyeOption[]>();
  const defaultRallyeNames = new Map<number, string>();
  const rallyeMapByLocation = new Map<number, Map<number, string>>();
  const emptyRallyeMap = new Map<number, string>();

  for (const row of rallyeRows || []) {
    const rallye = row as {
      id: number;
      name: string;
      department?:
        | { location_id: number }
        | Array<{ location_id: number }>
        | null;
    };

    const department = Array.isArray(rallye.department)
      ? rallye.department[0]
      : rallye.department;
    if (!department || typeof department.location_id !== 'number') {
      continue;
    }

    let locationRallyes = rallyeMapByLocation.get(department.location_id);
    if (!locationRallyes) {
      locationRallyes = new Map<number, string>();
      rallyeMapByLocation.set(department.location_id, locationRallyes);
    }

    if (typeof rallye.id === 'number' && typeof rallye.name === 'string') {
      locationRallyes.set(rallye.id, rallye.name);
    }
  }

  if (locations) {
    locations.forEach((location) => {
      const rallyesForLocation =
        rallyeMapByLocation.get(location.id) || emptyRallyeMap;
      const options = Array.from(rallyesForLocation.entries())
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) =>
          a.name.localeCompare(b.name, 'de', { sensitivity: 'base' })
        );

      rallyeOptionsMap.set(location.id, options);

      if (location.default_rallye_id) {
        const defaultRallyeName = rallyesForLocation.get(
          location.default_rallye_id
        );
        if (defaultRallyeName) {
          defaultRallyeNames.set(location.id, defaultRallyeName);
        }
      }
    });
  }

  // Sort locations manually (supabase can't sort ignoring case)
  if (locations) {
    locations.sort((a, b) =>
      a.name.localeCompare(b.name, 'de', { sensitivity: 'base' })
    );
  }

  const isSingleSite = (locations?.length ?? 0) === 1;
  const activeSiteName = locations?.[0]?.name ?? 'DHBW Lörrach';

  return (
    <div className="mx-auto w-full max-w-350 space-y-6 px-4 py-8">
      <Button asChild variant="outline" size="sm" className="w-fit">
        <Link href="/admin">← Zurück zur Verwaltung</Link>
      </Button>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Standorte</h1>
          <p className="text-muted-foreground">
            Standorte und deren Campus-Touren verwalten.
          </p>
        </div>
        <LocationDialog buttonStyle="ml-auto" />
      </div>

      {isSingleSite && (
        <div
          className="rounded-md border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground"
          role="status"
        >
          Aktuell läuft die Web-App im Single-Site-Betrieb für {activeSiteName}.
          Die Standortverwaltung bleibt für einen späteren Multi-Site-Ausbau
          sichtbar, wird derzeit aber nur informativ genutzt.
        </div>
      )}

      {!locations || locations.length === 0 ? (
        <div className="flex min-h-96 flex-col items-center justify-center space-y-2 rounded-md border border-dashed border-border/60 bg-muted/20 p-8 text-center">
          <h2 className="text-lg font-medium text-foreground">
            Keine Standorte
          </h2>
          <p className="text-sm text-muted-foreground">
            Den ersten Standort anlegen, um zu beginnen.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => (
            <Location
              key={location.id}
              location={location}
              rallyeOptions={rallyeOptionsMap.get(location.id) || []}
              defaultRallyeName={defaultRallyeNames.get(location.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
