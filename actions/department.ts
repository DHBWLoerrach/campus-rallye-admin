'use server';
import { revalidatePath } from 'next/cache';
import createClient from '@/lib/supabase';
import { requireProfile } from '@/lib/require-profile';
import { Department } from '@/lib/types';

type FormState = { errors?: { message?: string }; success?: { message?: string } } | undefined;

export async function getDepartments(): Promise<Department[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('department')
    .select('*, organization:organization_id(id, name)')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching departments:', error);
    return [];
  }

  return data || [];
}

export async function getDepartmentsByOrganization(organizationId: number): Promise<Department[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('department')
    .select('*, organization:organization_id(id, name)')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching departments:', error);
    return [];
  }

  return data || [];
}

export async function getDepartmentsWithRallyes(): Promise<Department[]> {
  const supabase = await createClient();

  const { data: departments, error: deptError } = await supabase
    .from('department')
    .select('*, organization:organization_id(id, name)')
    .order('name', { ascending: true });

  if (deptError) {
    console.error('Error fetching departments:', deptError);
    return [];
  }

  if (!departments || departments.length === 0) {
    return [];
  }

  // Hole alle Rallye-Verknüpfungen
  const { data: joins, error: joinError } = await supabase
    .from('join_department_rallye')
    .select('department_id, rallye_id, rallye:rallye_id(id, name, status)')
    .in('department_id', departments.map(d => d.id));

  if (joinError) {
    console.error('Error fetching rallye joins:', joinError);
    return departments;
  }

  // Füge Rallyes zu Departments hinzu
  return departments.map(dept => ({
    ...dept,
    rallyes: joins
      ?.filter(j => j.department_id === dept.id)
      .map(j => j.rallye)
      .filter(Boolean) || []
  }));
}

export async function getDepartment(id: number): Promise<Department | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('department')
    .select('*, organization:organization_id(id, name)')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching department:', error);
    return null;
  }

  return data;
}

export async function createDepartment(state: FormState, formData: FormData) {
  await requireProfile();
  const supabase = await createClient();

  const name = formData.get('name') as string;
  const organizationId = formData.get('organization_id') as string;

  if (!name || name.trim().length === 0) {
    return { errors: { message: 'Name ist erforderlich' } };
  }

  if (!organizationId || organizationId === '') {
    return { errors: { message: 'Organisation ist erforderlich' } };
  }

  const { error } = await supabase.from('department').insert({
    name: name.trim(),
    organization_id: parseInt(organizationId, 10),
  });

  if (error) {
    console.error('Error creating department:', error);
    return { errors: { message: 'Es ist ein Fehler aufgetreten' } };
  }

  revalidatePath('/departments');
  return { success: { message: 'Studiengang/Abteilung erfolgreich erstellt' } };
}

export async function updateDepartment(state: FormState, formData: FormData) {
  await requireProfile();
  const supabase = await createClient();

  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const organizationId = formData.get('organization_id') as string;

  if (!name || name.trim().length === 0) {
    return { errors: { message: 'Name ist erforderlich' } };
  }

  if (!organizationId || organizationId === '') {
    return { errors: { message: 'Organisation ist erforderlich' } };
  }

  const { error } = await supabase
    .from('department')
    .update({
      name: name.trim(),
      organization_id: parseInt(organizationId, 10),
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating department:', error);
    return { errors: { message: 'Es ist ein Fehler aufgetreten' } };
  }

  revalidatePath('/departments');
  return { success: { message: 'Studiengang/Abteilung erfolgreich aktualisiert' } };
}

export async function deleteDepartment(id: number) {
  await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase.from('department').delete().eq('id', id);

  if (error) {
    console.error('Error deleting department:', error);
    return { errors: { message: 'Fehler beim Löschen des Studiengangs/Abteilung' } };
  }

  revalidatePath('/departments');
  return { success: { message: 'Studiengang/Abteilung erfolgreich gelöscht' } };
}
