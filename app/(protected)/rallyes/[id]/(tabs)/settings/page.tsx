import { notFound } from 'next/navigation';
import createClient from '@/lib/supabase';
import RallyeSettingsForm from '@/components/rallyes/RallyeSettingsForm';
import type { DepartmentOption, Rallye } from '@/lib/types';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RallyeSettingsPage(props: PageProps) {
  const params = await props.params;
  const idStr = params.id;
  if (!/^\d+$/.test(idStr)) {
    notFound();
  }
  const rallyeId = Number(idStr);

  const supabase = await createClient();
  const { data: rallye } = await supabase
    .from('rallyes')
    .select(
      'id, name, status, rallye_end, rallye_code, created_at, department_id'
    )
    .eq('id', rallyeId)
    .maybeSingle();
  if (!rallye) {
    notFound();
  }

  const { data: departments } = await supabase
    .from('department')
    .select('id, name')
    .order('name');

  return (
    <RallyeSettingsForm
      rallye={rallye as Rallye}
      departmentOptions={(departments ?? []) as DepartmentOption[]}
      assignedDepartmentIds={
        rallye.department_id ? [rallye.department_id as number] : []
      }
    />
  );
}
