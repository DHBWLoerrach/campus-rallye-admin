'use server';
import { revalidatePath } from 'next/cache';
import createClient from '@/lib/supabase';
import { requireAdmin } from '@/lib/require-profile';
import {
  listLocalUsers,
  setLocalUserDepartment,
  type LocalUser,
} from '@/lib/db/local-user';
import { fail, ok, type ActionResult } from '@/lib/action-result';

export async function getLocalUsers(): Promise<ActionResult<LocalUser[]>> {
  await requireAdmin();
  return ok(listLocalUsers());
}

export async function assignUserDepartment(
  userId: string,
  departmentId: number | null
): Promise<ActionResult<{ message: string }>> {
  await requireAdmin();

  if (!userId) {
    return fail('Ungültige Nutzer-ID');
  }

  // Consistency mechanism: validate the Supabase department id before
  // persisting it in the local SQLite database (no cross-system FK).
  if (departmentId !== null) {
    const supabase = await createClient();
    const { data: department, error } = await supabase
      .from('departments')
      .select('id')
      .eq('id', departmentId)
      .maybeSingle();

    if (error) {
      console.error('Error validating department:', error);
      return fail('Es ist ein Fehler aufgetreten');
    }

    if (!department) {
      return fail('Bereich nicht gefunden');
    }
  }

  const updated = setLocalUserDepartment(userId, departmentId);
  if (!updated) {
    return fail('Nutzer nicht gefunden');
  }

  revalidatePath('/admin/users');
  return ok({ message: 'Bereich erfolgreich zugeordnet' });
}
