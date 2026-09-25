import { notFound } from 'next/navigation';
import createClient from '@/lib/supabase';
import RallyeSettingsForm from '@/components/rallyes/RallyeSettingsForm';
import {
  getRallyeCampusTourStatus,
  getRallyeRunDataSummary,
} from '@/actions/rallye';
import { canResetRallye } from '@/lib/types';
import type { DepartmentOption, Rallye, RallyeStatus } from '@/lib/types';

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

  const [{ data: departments }, campusTourResult] = await Promise.all([
    supabase.from('departments').select('id, name').order('name'),
    getRallyeCampusTourStatus(rallyeId),
  ]);

  // Campus tours have no run data and are no team rallyes to copy; if the
  // check fails, hide reset and duplication rather than offer them for a
  // rallye that might be a campus tour.
  const isTeamRallye = campusTourResult.success && !campusTourResult.data;
  const canReset =
    canResetRallye(rallye.status as RallyeStatus) && isTeamRallye;

  let runDataSummary = null;
  if (canReset) {
    const summaryResult = await getRallyeRunDataSummary(rallyeId);
    runDataSummary = summaryResult.success ? summaryResult.data : null;
  }

  return (
    <RallyeSettingsForm
      rallye={rallye as Rallye}
      departmentOptions={(departments ?? []) as DepartmentOption[]}
      assignedDepartmentIds={
        rallye.department_id ? [rallye.department_id as number] : []
      }
      canReset={canReset}
      canDuplicate={isTeamRallye}
      runDataSummary={runDataSummary}
    />
  );
}
