'use server';
import { revalidatePath } from 'next/cache';
import createClient from '@/lib/supabase';
import { requireAdmin } from '@/lib/require-profile';
import { clearDepartmentAssignments } from '@/lib/db/local-user';
import { Department, DepartmentOption } from '@/lib/types';
import { fail, ok, type ActionResult } from '@/lib/action-result';
import {
  formatZodError,
  departmentCreateSchema,
  departmentUpdateSchema,
} from '@/lib/validation';

type FormState = ActionResult<{
  message: string;
  departmentId?: number;
}> | null;

export async function createDepartment(state: FormState, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const parsed = departmentCreateSchema.safeParse({
    name: formData.get('name'),
    location_id: formData.get('location_id'),
  });

  if (!parsed.success) {
    return fail('Ungültige Eingaben', formatZodError(parsed.error));
  }

  const data = {
    name: parsed.data.name,
    location_id: parsed.data.location_id,
  };

  // Verify that the location exists
  const { data: existingLocation, error: locationError } = await supabase
    .from('locations')
    .select('id')
    .eq('id', data.location_id)
    .maybeSingle();

  if (locationError) {
    console.error('Error checking location:', locationError);
    return fail('Es ist ein Fehler aufgetreten');
  }

  if (!existingLocation) {
    return fail('Standort nicht gefunden');
  }

  const { data: createdDepartment, error } = await supabase
    .from('departments')
    .insert(data)
    .select('id')
    .single();

  if (error || !createdDepartment) {
    console.error('Error creating department:', error);
    return fail('Es ist ein Fehler aufgetreten');
  }

  // Save rallye assignments
  const rallyeIds = formData
    .getAll('rallye_ids')
    .map(Number)
    .filter((id) => !isNaN(id) && id > 0);

  if (rallyeIds.length > 0) {
    const { error: rallyeAssignError } = await supabase
      .from('rallyes')
      .update({ department_id: createdDepartment.id })
      .in('id', rallyeIds);

    if (rallyeAssignError) {
      console.error('Error saving rallye assignments:', rallyeAssignError);
      const { error: rollbackError } = await supabase
        .from('departments')
        .delete()
        .eq('id', createdDepartment.id);

      if (rollbackError) {
        console.error(
          'Error rolling back department creation after assignment failure:',
          rollbackError
        );
      }

      return fail('Es ist ein Fehler aufgetreten');
    }
  }

  revalidatePath('/admin/departments');
  revalidatePath('/admin/locations');
  return ok({
    message: 'Bereich erfolgreich gespeichert',
    departmentId: createdDepartment.id,
  });
}

export async function updateDepartment(state: FormState, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const parsed = departmentUpdateSchema.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
    location_id: formData.get('location_id'),
  });

  if (!parsed.success) {
    return fail('Ungültige Eingaben', formatZodError(parsed.error));
  }

  const data = parsed.data;

  // Verify that the department exists
  const { data: existingDepartment, error: existingError } = await supabase
    .from('departments')
    .select('id')
    .eq('id', data.id)
    .maybeSingle();

  if (existingError) {
    console.error('Error checking department:', existingError);
    return fail('Es ist ein Fehler aufgetreten');
  }

  if (!existingDepartment) {
    return fail('Bereich nicht gefunden');
  }

  // Verify that the location exists
  const { data: existingLocation, error: locationError } = await supabase
    .from('locations')
    .select('id')
    .eq('id', data.location_id)
    .maybeSingle();

  if (locationError) {
    console.error('Error checking location:', locationError);
    return fail('Es ist ein Fehler aufgetreten');
  }

  if (!existingLocation) {
    return fail('Standort nicht gefunden');
  }

  const updatePayload = {
    name: data.name,
    location_id: data.location_id,
  };

  const { error } = await supabase
    .from('departments')
    .update(updatePayload)
    .eq('id', data.id);

  if (error) {
    console.error('Error updating department:', error);
    return fail('Es ist ein Fehler aufgetreten');
  }

  // Sync rallye assignments by delta on rallye.department_id.
  const selectedRallyeIds = Array.from(
    new Set(
      formData
        .getAll('rallye_ids')
        .map(Number)
        .filter((id) => !isNaN(id) && id > 0)
    )
  );

  const { data: existingAssignments, error: existingAssignmentsError } =
    await supabase.from('rallyes').select('id').eq('department_id', data.id);

  if (existingAssignmentsError) {
    console.error(
      'Error loading existing rallye assignments:',
      existingAssignmentsError
    );
    return fail('Es ist ein Fehler aufgetreten');
  }

  const existingRallyeIds = new Set(
    (existingAssignments || []).map((row) => row.id)
  );
  const selectedRallyeIdSet = new Set(selectedRallyeIds);

  const rallyeIdsToInsert = selectedRallyeIds.filter(
    (rallyeId) => !existingRallyeIds.has(rallyeId)
  );
  const rallyeIdsToDelete = Array.from(existingRallyeIds).filter(
    (rallyeId) => !selectedRallyeIdSet.has(rallyeId)
  );

  if (rallyeIdsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('rallyes')
      .update({ department_id: data.id })
      .in('id', rallyeIdsToInsert);

    if (insertError) {
      console.error('Error saving rallye assignments:', insertError);
      return fail('Es ist ein Fehler aufgetreten');
    }
  }

  if (rallyeIdsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('rallyes')
      .update({ department_id: null })
      .eq('department_id', data.id)
      .in('id', rallyeIdsToDelete);

    if (deleteError) {
      console.error('Error deleting rallye assignments:', deleteError);
      return fail('Es ist ein Fehler aufgetreten');
    }
  }

  revalidatePath('/admin/departments');
  revalidatePath('/admin/locations');
  return ok({ message: 'Bereich erfolgreich gespeichert' });
}

export async function getDepartments(): Promise<ActionResult<Department[]>> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('departments')
    .select('id, name, created_at, location_id')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching departments:', error);
    return fail('Fehler beim Laden der Bereiche');
  }

  return ok(data || []);
}

export async function getDepartmentOptions(): Promise<
  ActionResult<DepartmentOption[]>
> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase.from('departments').select('id, name');

  if (error) {
    console.error('Error fetching department options:', error);
    return fail('Fehler beim Laden der Bereiche');
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
  await requireAdmin();
  const supabase = await createClient();

  const idResult = departmentUpdateSchema.shape.id.safeParse(departmentId);
  if (!idResult.success) {
    return fail('Ungültige Bereichs-ID', formatZodError(idResult.error));
  }

  const { data: existingDepartment, error: existingError } = await supabase
    .from('departments')
    .select('id')
    .eq('id', idResult.data)
    .maybeSingle();

  if (existingError) {
    console.error('Error checking department:', existingError);
    return fail('Es ist ein Fehler aufgetreten');
  }

  if (!existingDepartment) {
    return fail('Bereich nicht gefunden');
  }

  // Rallyes reference departments with ON DELETE RESTRICT, so deleting a
  // department that still has rallyes fails with an opaque database error.
  // Surface an actionable message instead of the generic delete failure.
  const { data: assignedRallyes, error: assignedError } = await supabase
    .from('rallyes')
    .select('id')
    .eq('department_id', idResult.data);

  if (assignedError) {
    console.error('Error checking rallye assignments:', assignedError);
    return fail('Es ist ein Fehler aufgetreten');
  }

  if (assignedRallyes && assignedRallyes.length > 0) {
    return fail(
      'Der Bereich hat noch zugeordnete Rallyes. Bitte diese zuerst einem anderen Bereich zuordnen oder entfernen.'
    );
  }

  const { error } = await supabase
    .from('departments')
    .delete()
    .eq('id', idResult.data);

  if (error) {
    console.error('Error deleting department:', error);
    return fail('Fehler beim Löschen des Bereichs');
  }

  // Application-level ON DELETE SET NULL: local_users reference Supabase
  // departments without a real FK, so clear stale assignments here.
  const clearedUsers = clearDepartmentAssignments(idResult.data);
  if (clearedUsers > 0) {
    console.log(
      `Cleared department assignment for ${clearedUsers} local user(s)`
    );
  }

  revalidatePath('/admin/departments');
  revalidatePath('/admin/locations');
  revalidatePath('/admin/users');
  return ok({ message: 'Bereich erfolgreich gelöscht' });
}

export async function getRallyeAssignmentsByDepartment(
  departmentId: number
): Promise<ActionResult<number[]>> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('rallyes')
    .select('id')
    .eq('department_id', departmentId);

  if (error) {
    console.error('Error fetching rallye assignments:', error);
    return fail('Fehler beim Laden der Rallye-Zuordnungen');
  }

  return ok((data || []).map((row) => row.id));
}
