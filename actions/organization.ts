'use server';
import { revalidatePath } from 'next/cache';
import createClient from '@/lib/supabase';
import { requireProfile } from '@/lib/require-profile';
import { Organization } from '@/lib/types';

type FormState = { errors?: { message?: string }; success?: { message?: string } } | undefined;

export async function getOrganizations(): Promise<Organization[]> {
  const supabase = await createClient();

  const { data: organizations, error } = await supabase
    .from('organization')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching organizations:', error);
    return [];
  }

  if (!organizations || organizations.length === 0) {
    return [];
  }

  // Hole die default_rallye-Informationen separat
  const orgIds = organizations.filter(o => o.default_rallye_id).map(o => o.default_rallye_id);
  let defaultRallyes: { id: number; name: string }[] = [];
  if (orgIds.length > 0) {
    const { data: rallyes } = await supabase
      .from('rallye')
      .select('id, name')
      .in('id', orgIds);
    defaultRallyes = rallyes || [];
  }

  return organizations.map(org => ({
    ...org,
    default_rallye: defaultRallyes.find(r => r.id === org.default_rallye_id) || null
  }));
}

export async function getOrganizationsWithDepartments(): Promise<Organization[]> {
  const supabase = await createClient();

  const { data: organizations, error: orgError } = await supabase
    .from('organization')
    .select('*')
    .order('name', { ascending: true });

  console.log('Organizations fetched:', organizations, 'Error:', orgError);

  if (orgError) {
    console.error('Error fetching organizations:', orgError);
    return [];
  }

  if (!organizations || organizations.length === 0) {
    console.log('No organizations found');
    return [];
  }

  // Hole alle Departments
  const { data: departments, error: deptError } = await supabase
    .from('department')
    .select('*')
    .in('organization_id', organizations.map(o => o.id))
    .order('name', { ascending: true });

  if (deptError) {
    console.error('Error fetching departments:', deptError);
    return organizations;
  }

  // Hole die default_rallye-Informationen separat
  const orgIds = organizations.filter(o => o.default_rallye_id).map(o => o.default_rallye_id);
  let defaultRallyes: { id: number; name: string }[] = [];
  if (orgIds.length > 0) {
    const { data: rallyes } = await supabase
      .from('rallye')
      .select('id, name')
      .in('id', orgIds);
    defaultRallyes = rallyes || [];
  }

  // Füge Departments und default_rallye zu Organizations hinzu
  return organizations.map(org => ({
    ...org,
    departments: departments?.filter(d => d.organization_id === org.id) || [],
    default_rallye: defaultRallyes.find(r => r.id === org.default_rallye_id) || null
  }));
}

export async function getOrganization(id: number): Promise<Organization | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('organization')
    .select('*, default_rallye:default_rallye_id(id, name)')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching organization:', error);
    return null;
  }

  return data;
}

export async function createOrganization(state: FormState, formData: FormData) {
  await requireProfile();
  const supabase = await createClient();

  const name = formData.get('name') as string;
  const defaultRallyeId = formData.get('default_rallye_id') as string;

  if (!name || name.trim().length === 0) {
    return { errors: { message: 'Name ist erforderlich' } };
  }

  const insertData: { name: string; default_rallye_id?: number } = {
    name: name.trim(),
  };

  if (defaultRallyeId && defaultRallyeId !== '') {
    insertData.default_rallye_id = parseInt(defaultRallyeId, 10);
  }

  const { error } = await supabase.from('organization').insert(insertData);

  if (error) {
    console.error('Error creating organization:', error);
    return { errors: { message: 'Es ist ein Fehler aufgetreten' } };
  }

  revalidatePath('/organizations');
  return { success: { message: 'Organisation erfolgreich erstellt' } };
}

export async function updateOrganization(state: FormState, formData: FormData) {
  await requireProfile();
  const supabase = await createClient();

  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const defaultRallyeId = formData.get('default_rallye_id') as string;

  if (!name || name.trim().length === 0) {
    return { errors: { message: 'Name ist erforderlich' } };
  }

  const updateData: { name: string; default_rallye_id: number | null } = {
    name: name.trim(),
    default_rallye_id: defaultRallyeId && defaultRallyeId !== '' 
      ? parseInt(defaultRallyeId, 10) 
      : null,
  };

  const { error } = await supabase
    .from('organization')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Error updating organization:', error);
    return { errors: { message: 'Es ist ein Fehler aufgetreten' } };
  }

  revalidatePath('/organizations');
  return { success: { message: 'Organisation erfolgreich aktualisiert' } };
}

export async function deleteOrganization(id: number) {
  await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase.from('organization').delete().eq('id', id);

  if (error) {
    console.error('Error deleting organization:', error);
    return { errors: { message: 'Fehler beim Löschen der Organisation' } };
  }

  revalidatePath('/organizations');
  return { success: { message: 'Organisation erfolgreich gelöscht' } };
}
