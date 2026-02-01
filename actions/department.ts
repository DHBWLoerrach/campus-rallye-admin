'use server';
import { revalidatePath } from 'next/cache';
import createClient from '@/lib/supabase';
import { requireProfile } from '@/lib/require-profile';
import { Department, DepartmentOption } from '@/lib/types';
import { fail, ok, type ActionResult } from '@/lib/action-result';
import { formatZodError, departmentCreateSchema, departmentUpdateSchema } from '@/lib/validation';

type FormState = ActionResult<{ message: string; departmentId?: number }> | null;

export async function createDepartment(state: FormState, formData: FormData) {
  await requireProfile();
  const supabase = await createClient();

  const parsed = departmentCreateSchema.safeParse({
    name: formData.get('name'),
    organization_id: formData.get('organization_id'),
  });

  if (!parsed.success) {
    return fail('Ungültige Eingaben', formatZodError(parsed.error));
  }

  const data = {
    name: parsed.data.name,
    organization_id: parsed.data.organization_id,
  };

  // Verify that the organization exists
  const { data: existingOrganization, error: orgError } = await supabase
    .from('organization')
    .select('id')
    .eq('id', data.organization_id)
    .maybeSingle();

  if (orgError) {
    console.error('Error checking organization:', orgError);
    return fail('Es ist ein Fehler aufgetreten');
  }

  if (!existingOrganization) {
    return fail('Organisation nicht gefunden');
  }

  const { data: createdDepartment, error } = await supabase
    .from('department')
    .insert(data)
    .select('id')
    .single();

  if (error || !createdDepartment) {
    console.error('Error creating department:', error);
    return fail('Es ist ein Fehler aufgetreten');
  }

  revalidatePath('/');
  return ok({
    message: 'Abteilung erfolgreich gespeichert',
    departmentId: createdDepartment.id,
  });
}

export async function updateDepartment(state: FormState, formData: FormData) {
  await requireProfile();
  const supabase = await createClient();

  const parsed = departmentUpdateSchema.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
    organization_id: formData.get('organization_id'),
  });

  if (!parsed.success) {
    return fail('Ungültige Eingaben', formatZodError(parsed.error));
  }

  const data = parsed.data;

  // Verify that the department exists
  const { data: existingDepartment, error: existingError } = await supabase
    .from('department')
    .select('id')
    .eq('id', data.id)
    .maybeSingle();

  if (existingError) {
    console.error('Error checking department:', existingError);
    return fail('Es ist ein Fehler aufgetreten');
  }

  if (!existingDepartment) {
    return fail('Abteilung nicht gefunden');
  }

  // Verify that the organization exists
  const { data: existingOrganization, error: orgError } = await supabase
    .from('organization')
    .select('id')
    .eq('id', data.organization_id)
    .maybeSingle();

  if (orgError) {
    console.error('Error checking organization:', orgError);
    return fail('Es ist ein Fehler aufgetreten');
  }

  if (!existingOrganization) {
    return fail('Organisation nicht gefunden');
  }

  const updatePayload = {
    name: data.name,
    organization_id: data.organization_id,
  };

  const { error } = await supabase
    .from('department')
    .update(updatePayload)
    .eq('id', data.id);

  if (error) {
    console.error('Error updating department:', error);
    return fail('Es ist ein Fehler aufgetreten');
  }

  revalidatePath('/');
  return ok({ message: 'Abteilung erfolgreich gespeichert' });
}

export async function getDepartments(): Promise<ActionResult<Department[]>> {
  await requireProfile();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('department')
    .select('id, name, created_at, organization_id')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching departments:', error);
    return fail('Fehler beim Laden der Abteilungen');
  }

  return ok(data || []);
}

export async function getDepartmentOptions(): Promise<ActionResult<DepartmentOption[]>> {
  await requireProfile();
  const supabase = await createClient();

  const { data, error } = await supabase.from('department').select('id, name');

  if (error) {
    console.error('Error fetching department options:', error);
    return fail('Fehler beim Laden der Abteilungen');
  }

  const departments = (data || []) as DepartmentOption[];
  departments.sort((a, b) =>
    a.name.localeCompare(b.name, 'de', { sensitivity: 'base' })
  );
  return ok(departments);
}

export async function deleteDepartment(
  departmentId: string
): Promise<ActionResult<{ message: string }>> {
  await requireProfile();
  const supabase = await createClient();

  const idResult = departmentUpdateSchema.shape.id.safeParse(departmentId);
  if (!idResult.success) {
    return fail('Ungültige Abteilungs-ID', formatZodError(idResult.error));
  }

  const { data: existingDepartment, error: existingError } = await supabase
    .from('department')
    .select('id')
    .eq('id', idResult.data)
    .maybeSingle();

  if (existingError) {
    console.error('Error checking department:', existingError);
    return fail('Es ist ein Fehler aufgetreten');
  }

  if (!existingDepartment) {
    return fail('Abteilung nicht gefunden');
  }

  const { error } = await supabase
    .from('department')
    .delete()
    .eq('id', idResult.data);

  if (error) {
    console.error('Error deleting department:', error);
    return fail('Fehler beim Löschen der Abteilung');
  }

  revalidatePath('/');
  return ok({ message: 'Abteilung erfolgreich gelöscht' });
}