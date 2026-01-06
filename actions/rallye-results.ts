'use server';

import createClient from '@/lib/supabase';
import { requireProfile } from '@/lib/require-profile';
import { fail, ok, type ActionResult } from '@/lib/action-result';
import { formatZodError, idSchema } from '@/lib/validation';

export type RallyeResultRow = {
  rank: number;
  teamId: number;
  teamName: string;
  points: number;
  durationMs: number | null;
};

type RallyeRow = {
  id: number;
  status: string;
};

type TeamRow = {
  id: number;
  name: string;
  created_at: string;
  time_played: string | null;
};

const formatDurationMs = (team: TeamRow): number | null => {
  if (!team.time_played) return null;
  const start = new Date(team.created_at).getTime();
  const end = new Date(team.time_played).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return null;
  }
  return end - start;
};

export async function getRallyeResults(
  rallyeId: number
): Promise<ActionResult<RallyeResultRow[]>> {
  await requireProfile();
  const rallyeIdResult = idSchema.safeParse(rallyeId);
  if (!rallyeIdResult.success) {
    return fail('Ungültige Rallye-ID', formatZodError(rallyeIdResult.error));
  }

  const supabase = await createClient();
  const { data: rallye, error: rallyeError } = await supabase
    .from('rallye')
    .select('id, status')
    .eq('id', rallyeIdResult.data)
    .maybeSingle();

  if (rallyeError) {
    console.error('Error checking rallye:', rallyeError);
    return fail('Rallye konnte nicht geladen werden');
  }

  if (!rallye) {
    return fail('Rallye nicht gefunden');
  }

  if ((rallye as RallyeRow).status !== 'ended') {
    return fail('Rallye ist nicht beendet');
  }

  const { data: teamRows, error: teamError } = await supabase
    .from('rallye_team')
    .select('id, name, created_at, time_played')
    .eq('rallye_id', rallyeIdResult.data);

  if (teamError) {
    console.error('Error fetching rallye teams:', teamError);
    return fail('Teams konnten nicht geladen werden');
  }

  const teams = (teamRows || []) as TeamRow[];
  if (teams.length === 0) {
    return ok([]);
  }

  const teamIds = teams.map((team) => team.id);
  const { data: teamQuestionRows, error: teamQuestionError } = await supabase
    .from('team_questions')
    .select('team_id, points')
    .in('team_id', teamIds);

  if (teamQuestionError) {
    console.error('Error fetching team questions:', teamQuestionError);
    return fail('Ergebnisse konnten nicht geladen werden');
  }

  const pointsByTeam = new Map<number, number>();
  (teamQuestionRows || []).forEach((row) => {
    const teamId = row.team_id;
    const points = Number(row.points ?? 0);
    const current = pointsByTeam.get(teamId) ?? 0;
    pointsByTeam.set(teamId, current + (Number.isNaN(points) ? 0 : points));
  });

  const rows = teams.map((team) => ({
    rank: 0,
    teamId: team.id,
    teamName: team.name,
    points: pointsByTeam.get(team.id) ?? 0,
    durationMs: formatDurationMs(team),
  }));

  rows.sort((a, b) => {
    if (a.points !== b.points) {
      return b.points - a.points;
    }
    const durationA = a.durationMs ?? Number.POSITIVE_INFINITY;
    const durationB = b.durationMs ?? Number.POSITIVE_INFINITY;
    if (durationA !== durationB) {
      return durationA - durationB;
    }
    return a.teamName.localeCompare(b.teamName, 'de', { sensitivity: 'base' });
  });

  rows.forEach((row, index) => {
    row.rank = index + 1;
  });

  return ok(rows);
}
