'use server';
import { revalidatePath } from 'next/cache';
import createClient from '@/lib/supabase';
import { requireProfile } from '@/lib/require-profile';
import { Rallye, RallyeStatus } from '@/lib/types';

type FormState = { errors?: { message?: string } } | undefined;

export async function createRallye(state: FormState, formData: FormData) {
  await requireProfile();
  const supabase = await createClient();

  const data = { name: formData.get('name') as string };

  const { error } = await supabase.from('rallye').insert({
    name: data.name,
    status: 'inactive' as RallyeStatus,
    end_time: new Date(),
    password: '',
  });

  if (error) {
    console.log(error);
    return { errors: { message: 'Es ist ein Fehler aufgetreten' } };
  }

  revalidatePath('/');
  return { success: { message: 'Rallye erfolgreich gespeichert' } };
}

export async function updateRallye(state: FormState, formData: FormData) {
  await requireProfile();
  const supabase = await createClient();

  const data = {
    id: formData.get('id') as string,
    name: formData.get('name') as string,
    status: formData.get('status') as RallyeStatus,
    end_time: new Date(formData.get('end_time') as string),
    password: formData.get('password') as string,
  };
  
  const { error } = await supabase
    .from('rallye')
    .update({
      name: data.name,
      status: data.status,
      end_time: data.end_time,
      password: data.password,
    })
    .eq('id', data.id);

  if (error) {
    return { errors: { message: 'Es ist ein Fehler aufgetreten' } };
  }

  revalidatePath('/');
  return { success: { message: 'Rallye erfolgreich gespeichert' } };
}

export async function getRallyes(): Promise<Rallye[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('rallye')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching rallyes:', error);
    return [];
  }

  return data || [];
}

export async function getRallyesWithDepartments(): Promise<Rallye[]> {
  const supabase = await createClient();

  const { data: rallyes, error: rallyeError } = await supabase
    .from('rallye')
    .select('*')
    .order('created_at', { ascending: false });

  if (rallyeError) {
    console.error('Error fetching rallyes:', rallyeError);
    return [];
  }

  if (!rallyes || rallyes.length === 0) {
    return [];
  }

  // Hole alle Department-Verknüpfungen
  const { data: joins, error: joinError } = await supabase
    .from('join_department_rallye')
    .select('rallye_id, department_id, department:department_id(id, name, organization_id)')
    .in('rallye_id', rallyes.map(r => r.id));

  if (joinError) {
    console.error('Error fetching department joins:', joinError);
    return rallyes;
  }

  // Füge Departments zu Rallyes hinzu
  return rallyes.map(rallye => ({
    ...rallye,
    departments: joins
      ?.filter(j => j.rallye_id === rallye.id)
      .map(j => j.department)
      .filter(Boolean) || []
  }));
}

export async function deleteRallye(rallyeId: string) {
  await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase.from('rallye').delete().eq('id', rallyeId);

  if (error) {
    console.error('Error deleting rallye:', error);
    return { errors: { message: 'Fehler beim Löschen der Rallye' } };
  }

  revalidatePath('/');
  return { success: { message: 'Rallye erfolgreich gelöscht' } };
}

// Department-Rallye Verknüpfungen
export async function assignDepartmentToRallye(departmentId: number, rallyeId: number) {
  await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from('join_department_rallye')
    .insert({ department_id: departmentId, rallye_id: rallyeId });

  if (error) {
    console.error('Error assigning department to rallye:', error);
    return { errors: { message: 'Fehler beim Zuordnen des Studiengangs' } };
  }

  revalidatePath('/');
  return { success: { message: 'Studiengang erfolgreich zugeordnet' } };
}

export async function removeDepartmentFromRallye(departmentId: number, rallyeId: number) {
  await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from('join_department_rallye')
    .delete()
    .eq('department_id', departmentId)
    .eq('rallye_id', rallyeId);

  if (error) {
    console.error('Error removing department from rallye:', error);
    return { errors: { message: 'Fehler beim Entfernen des Studiengangs' } };
  }

  revalidatePath('/');
  return { success: { message: 'Studiengang erfolgreich entfernt' } };
}

export async function getRallyeDepartments(rallyeId: number) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('join_department_rallye')
    .select('department:department_id(id, name, organization_id)')
    .eq('rallye_id', rallyeId);

  if (error) {
    console.error('Error fetching rallye departments:', error);
    return [];
  }

  return data?.map(d => d.department).filter(Boolean) || [];
}
