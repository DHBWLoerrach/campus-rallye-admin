'use server';
import { revalidatePath } from 'next/cache';
import createClient from '@/lib/supabase';
import { requireAdmin } from '@/lib/require-profile';
import { Location, LocationOption } from '@/lib/types';
import { fail, ok, type ActionResult } from '@/lib/action-result';
import {
  formatZodError,
  locationCreateSchema,
  locationUpdateSchema,
} from '@/lib/validation';
import type { RallyeOption } from '@/lib/types';

type FormState = ActionResult<{
  message: string;
  locationId?: number;
}> | null;

export async function createLocation(state: FormState, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const rawRallyeId = formData.get('default_rallye_id');
  const parsed = locationCreateSchema.safeParse({
    name: formData.get('name'),
    default_rallye_id:
      rawRallyeId === 'none' || !rawRallyeId ? undefined : rawRallyeId,
  });

  if (!parsed.success) {
    return fail('Ungültige Eingaben', formatZodError(parsed.error));
  }

  const data = {
    name: parsed.data.name,
    default_rallye_id: parsed.data.default_rallye_id || null,
  };

  const { data: createdLocation, error } = await supabase
    .from('locations')
    .insert(data)
    .select('id')
    .single();

  if (error || !createdLocation) {
    console.error('Error creating location:', error);
    return fail('Es ist ein Fehler aufgetreten');
  }

  revalidatePath('/admin/locations');
  return ok({
    message: 'Standort erfolgreich gespeichert',
    locationId: createdLocation.id,
  });
}

export async function updateLocation(state: FormState, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const rawRallyeId = formData.get('default_rallye_id');
  const parsed = locationUpdateSchema.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
    default_rallye_id:
      rawRallyeId === 'none' || !rawRallyeId ? undefined : rawRallyeId,
  });

  if (!parsed.success) {
    return fail('Ungültige Eingaben', formatZodError(parsed.error));
  }

  const data = parsed.data;

  const { data: existingLocation, error: existingError } = await supabase
    .from('locations')
    .select('id')
    .eq('id', data.id)
    .maybeSingle();

  if (existingError) {
    console.error('Error checking location:', existingError);
    return fail('Es ist ein Fehler aufgetreten');
  }

  if (!existingLocation) {
    return fail('Standort nicht gefunden');
  }

  const updatePayload = {
    name: data.name,
    default_rallye_id: data.default_rallye_id || null,
  };

  const { error } = await supabase
    .from('locations')
    .update(updatePayload)
    .eq('id', data.id);

  if (error) {
    console.error('Error updating location:', error);
    return fail('Es ist ein Fehler aufgetreten');
  }

  revalidatePath('/admin/locations');
  return ok({ message: 'Standort erfolgreich gespeichert' });
}

export async function getLocations(): Promise<ActionResult<Location[]>> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('locations')
    .select('id, name, created_at, default_rallye_id')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching locations:', error);
    return fail('Fehler beim Laden der Standorte');
  }

  return ok(data || []);
}

export async function getLocationOptions(): Promise<
  ActionResult<LocationOption[]>
> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase.from('locations').select('id, name');

  if (error) {
    console.error('Error fetching location options:', error);
    return fail('Fehler beim Laden der Standorte');
  }

  const locations = (data || []) as LocationOption[];
  locations.sort((a, b) =>
    a.name.localeCompare(b.name, 'de', { sensitivity: 'base' })
  );
  return ok(locations);
}

export async function deleteLocation(
  locationId: string
): Promise<ActionResult<{ message: string }>> {
  await requireAdmin();
  const supabase = await createClient();

  const idResult = locationUpdateSchema.shape.id.safeParse(locationId);
  if (!idResult.success) {
    return fail('Ungültige Standort-ID', formatZodError(idResult.error));
  }

  const { data: existingLocation, error: existingError } = await supabase
    .from('locations')
    .select('id')
    .eq('id', idResult.data)
    .maybeSingle();

  if (existingError) {
    console.error('Error checking location:', existingError);
    return fail('Es ist ein Fehler aufgetreten');
  }

  if (!existingLocation) {
    return fail('Standort nicht gefunden');
  }

  const { error } = await supabase
    .from('locations')
    .delete()
    .eq('id', idResult.data);

  if (error) {
    console.error('Error deleting location:', error);
    return fail('Fehler beim Löschen des Standorts');
  }

  revalidatePath('/admin/locations');
  return ok({ message: 'Standort erfolgreich gelöscht' });
}

export async function getRallyeOptionsByLocation(
  locationId: number
): Promise<ActionResult<RallyeOption[]>> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('rallyes')
    .select('id, name, department:department_id!inner(location_id)')
    .eq('department.location_id', locationId);

  if (error) {
    console.error('Error fetching rallye options for location:', error);
    return fail('Fehler beim Laden der Rallye-Optionen');
  }

  // Deduplicate by rallye id.
  const rallyeMap = new Map<number, string>();
  for (const row of data || []) {
    const rallye = row as { id: number; name: string };
    if (typeof rallye.id === 'number' && typeof rallye.name === 'string') {
      rallyeMap.set(rallye.id, rallye.name);
    }
  }

  const options: RallyeOption[] = Array.from(rallyeMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) =>
      a.name.localeCompare(b.name, 'de', { sensitivity: 'base' })
    );

  return ok(options);
}
