'use server';

import createClient from '@/lib/supabase';
import { requireProfile } from '@/lib/require-profile';
import { fail, ok, type ActionResult } from '@/lib/action-result';
import { formatZodError, idSchema } from '@/lib/validation';
import type { RallyeStatus } from '@/lib/types';

export type RallyeResultRow = {
  rank: number;
  teamId: number;
  teamName: string;
  points: number;
  durationMs: number | null;
  photoUrl?: string;
};

type RallyeRow = {
  id: number;
  status: RallyeStatus;
};

type TeamRow = {
  id: number;
  name: string;
  created_at: string;
  time_played: string | null;
};

type UploadRow = {
  team_id: number;
  team_answer: string | null;
  created_at: string;
};

const SIGNED_URL_TTL_SECONDS = 60 * 60;

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

  const status = (rallye as RallyeRow).status;
  if (status !== 'ended' && status !== 'ranking') {
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

  const { data: uploadRows, error: uploadError } = await supabase
    .from('team_questions')
    .select('team_id, team_answer, created_at, questions!inner(type)')
    .in('team_id', teamIds)
    .eq('questions.type', 'upload');

  if (uploadError) {
    console.error('Error fetching upload answers:', uploadError);
    return fail('Ergebnisse konnten nicht geladen werden');
  }

  const latestUploadByTeam = new Map<
    number,
    { fileName: string; createdAt: number }
  >();
  (uploadRows || []).forEach((row) => {
    const upload = row as UploadRow;
    const fileName = (upload.team_answer ?? '').trim();
    if (!fileName) return;
    const createdAt = new Date(upload.created_at).getTime();
    if (Number.isNaN(createdAt)) return;
    const current = latestUploadByTeam.get(upload.team_id);
    if (!current || createdAt > current.createdAt) {
      latestUploadByTeam.set(upload.team_id, { fileName, createdAt });
    }
  });

  const photoUrlByTeam = new Map<number, string>();
  const storage = supabase.storage.from('upload-photos');
  await Promise.all(
    Array.from(latestUploadByTeam.entries()).map(async ([teamId, upload]) => {
      const { data, error } = await storage.createSignedUrl(
        upload.fileName,
        SIGNED_URL_TTL_SECONDS
      );
      if (error || !data?.signedUrl) {
        console.error('Error creating signed url:', {
          teamId,
          fileName: upload.fileName,
          error,
        });
        return;
      }
      photoUrlByTeam.set(teamId, data.signedUrl);
    })
  );

  const rows = teams.map((team) => ({
    rank: 0,
    teamId: team.id,
    teamName: team.name,
    points: pointsByTeam.get(team.id) ?? 0,
    durationMs: formatDurationMs(team),
    photoUrl: photoUrlByTeam.get(team.id),
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

export async function getRallyeMaxPoints(
  rallyeId: number
): Promise<ActionResult<number>> {
  await requireProfile();
  const rallyeIdResult = idSchema.safeParse(rallyeId);
  if (!rallyeIdResult.success) {
    return fail('Ungültige Rallye-ID', formatZodError(rallyeIdResult.error));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('join_rallye_questions')
    .select('question_id')
    .eq('rallye_id', rallyeIdResult.data);

  if (error) {
    console.error('Error fetching rallye questions:', error);
    return fail('Fragen konnten nicht geladen werden');
  }

  const questionIds = (data ?? []).map((row) => row.question_id);
  if (questionIds.length === 0) {
    return ok(0);
  }

  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select('points')
    .in('id', questionIds);

  if (questionsError) {
    console.error('Error fetching questions:', questionsError);
    return fail('Fragen konnten nicht geladen werden');
  }

  const totalPoints = (questions ?? []).reduce((sum, q) => {
    const points = q.points;
    return sum + (typeof points === 'number' ? points : 0);
  }, 0);

  return ok(totalPoints);
}
