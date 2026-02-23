'use server';
import { revalidatePath } from 'next/cache';
import createClient from '@/lib/supabase';
import { requireAdmin } from '@/lib/require-profile';
import { Organization, OrganizationOption } from '@/lib/types';
import { fail, ok, type ActionResult } from '@/lib/action-result';
import { formatZodError, organizationCreateSchema, organizationUpdateSchema } from '@/lib/validation';
import type { RallyeOption } from '@/lib/types';

type FormState = ActionResult<{ message: string; organizationId?: number }> | null;

export async function createOrganization(state: FormState, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const rawRallyeId = formData.get('default_rallye_id');
  const parsed = organizationCreateSchema.safeParse({
    name: formData.get('name'),
    default_rallye_id: rawRallyeId === 'none' || !rawRallyeId ? undefined : rawRallyeId,
  });

  if (!parsed.success) {
    return fail('Ungültige Eingaben', formatZodError(parsed.error));
  }

  const data = {
    name: parsed.data.name,
    default_rallye_id: parsed.data.default_rallye_id || null,
  };

  const { data: createdOrganization, error } = await supabase
    .from('organization')
    .insert(data)
    .select('id')
    .single();

  if (error || !createdOrganization) {
    console.error('Error creating organization:', error);
    return fail('Es ist ein Fehler aufgetreten');
  }

  revalidatePath('/organizations');
  return ok({
    message: 'Organisation erfolgreich gespeichert',
    organizationId: createdOrganization.id,
  });
}

export async function updateOrganization(state: FormState, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const rawRallyeId = formData.get('default_rallye_id');
  const parsed = organizationUpdateSchema.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
    default_rallye_id: rawRallyeId === 'none' || !rawRallyeId ? undefined : rawRallyeId,
  });

  if (!parsed.success) {
    return fail('Ungültige Eingaben', formatZodError(parsed.error));
  }

  const data = parsed.data;

  const { data: existingOrganization, error: existingError } = await supabase
    .from('organization')
    .select('id')
    .eq('id', data.id)
    .maybeSingle();

  if (existingError) {
    console.error('Error checking organization:', existingError);
    return fail('Es ist ein Fehler aufgetreten');
  }

  if (!existingOrganization) {
    return fail('Organisation nicht gefunden');
  }

  const updatePayload = {
    name: data.name,
    default_rallye_id: data.default_rallye_id || null,
  };

  const { error } = await supabase
    .from('organization')
    .update(updatePayload)
    .eq('id', data.id);

  if (error) {
    console.error('Error updating organization:', error);
    return fail('Es ist ein Fehler aufgetreten');
  }

  revalidatePath('/organizations');
  return ok({ message: 'Organisation erfolgreich gespeichert' });
}

export async function getOrganizations(): Promise<ActionResult<Organization[]>> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('organization')
    .select('id, name, created_at, default_rallye_id')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching organizations:', error);
    return fail('Fehler beim Laden der Organisationen');
  }

  return ok(data || []);
}

export async function getOrganizationOptions(): Promise<ActionResult<OrganizationOption[]>> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase.from('organization').select('id, name');

  if (error) {
    console.error('Error fetching organization options:', error);
    return fail('Fehler beim Laden der Organisationen');
  }

  const organizations = (data || []) as OrganizationOption[];
  organizations.sort((a, b) =>
    a.name.localeCompare(b.name, 'de', { sensitivity: 'base' })
  );
  return ok(organizations);
}

export async function deleteOrganization(
  organizationId: string
): Promise<ActionResult<{ message: string }>> {
  await requireAdmin();
  const supabase = await createClient();

  const idResult = organizationUpdateSchema.shape.id.safeParse(organizationId);
  if (!idResult.success) {
    return fail('Ungültige Organisations-ID', formatZodError(idResult.error));
  }

  const { data: existingOrganization, error: existingError } = await supabase
    .from('organization')
    .select('id')
    .eq('id', idResult.data)
    .maybeSingle();

  if (existingError) {
    console.error('Error checking organization:', existingError);
    return fail('Es ist ein Fehler aufgetreten');
  }

  if (!existingOrganization) {
    return fail('Organisation nicht gefunden');
  }

  const { error } = await supabase
    .from('organization')
    .delete()
    .eq('id', idResult.data);

  if (error) {
    console.error('Error deleting organization:', error);
    return fail('Fehler beim Löschen der Organisation');
  }

  revalidatePath('/organizations');
  return ok({ message: 'Organisation erfolgreich gelöscht' });
}

export async function getRallyeOptionsByOrganization(
  organizationId: number
): Promise<ActionResult<RallyeOption[]>> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('department')
    .select('join_department_rallye(rallye(id, name))')
    .eq('organization_id', organizationId);

  if (error) {
    console.error('Error fetching rallye options for organization:', error);
    return fail('Fehler beim Laden der Rallye-Optionen');
  }

  // Flatten nested join results and deduplicate by rallye id
  const rallyeMap = new Map<number, string>();
  for (const dept of data || []) {
    const joins = (dept as Record<string, unknown>).join_department_rallye;
    if (Array.isArray(joins)) {
      for (const join of joins) {
        const rallye = (join as Record<string, unknown>).rallye as {
          id: number;
          name: string;
        } | null;
        if (rallye) {
          rallyeMap.set(rallye.id, rallye.name);
        }
      }
    }
  }

  const options: RallyeOption[] = Array.from(rallyeMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }));

  return ok(options);
}