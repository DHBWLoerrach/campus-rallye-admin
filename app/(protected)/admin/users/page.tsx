import { redirect } from 'next/navigation';
import createClient from '@/lib/supabase';
import { requireAdmin } from '@/lib/require-profile';
import { listLocalUsers } from '@/lib/db/local-user';
import UsersClient from '@/components/UsersClient';

export default async function UsersPage() {
  try {
    await requireAdmin();
  } catch {
    redirect('/rallyes');
  }

  const supabase = await createClient();
  const { data: departmentOptions } = await supabase
    .from('departments')
    .select('id, name')
    .order('name');

  const users = listLocalUsers();

  return (
    <UsersClient users={users} departmentOptions={departmentOptions || []} />
  );
}
