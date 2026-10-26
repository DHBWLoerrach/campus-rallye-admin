import type createClient from './supabase';
import { fail, ok, type ActionResult } from './action-result';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export const UPLOAD_PHOTOS_BUCKET = 'upload-photos';

export type UploadQuestion = {
  id: number;
  content: string;
};

export type UploadPhotoTeam = {
  id: number;
  name: string;
};

// A photo a team submitted for an upload question, referenced by its path in
// the upload-photos bucket.
export type UploadPhotoRef = {
  teamQuestionId: number;
  teamId: number;
  teamName: string;
  questionId: number;
  fileName: string;
};

export type RallyeUploadPhotos = {
  questions: UploadQuestion[];
  teams: UploadPhotoTeam[];
  photos: UploadPhotoRef[];
};

type UploadQuestionRow = {
  question_id: number;
  questions?:
    | { id: number; content: string; type: string }
    | { id: number; content: string; type: string }[];
};

type TeamQuestionRow = {
  id: number;
  team_id: number;
  question_id: number;
  answer: string | null;
};

// Loads the upload questions of a rallye, its teams and every stored photo
// reference. Callers must check access and that the rallye exists.
export async function loadRallyeUploadPhotos(
  supabase: SupabaseClient,
  rallyeId: number
): Promise<ActionResult<RallyeUploadPhotos>> {
  const { data: uploadQuestionRows, error: uploadQuestionError } =
    await supabase
      .from('rallye_questions')
      .select('question_id, questions!inner(id, content, type)')
      .eq('rallye_id', rallyeId)
      .eq('questions.type', 'upload');

  if (uploadQuestionError) {
    console.error('Error fetching upload questions:', uploadQuestionError);
    return fail('Upload-Fragen konnten nicht geladen werden');
  }

  const questions = (uploadQuestionRows || [])
    .map((row) => row as UploadQuestionRow)
    .map((row) => {
      if (!row.questions) return null;
      return Array.isArray(row.questions) ? row.questions[0] : row.questions;
    })
    .filter(
      (question): question is { id: number; content: string; type: string } =>
        !!question
    )
    .map((question) => ({ id: question.id, content: question.content }));

  if (questions.length === 0) {
    return ok({ questions: [], teams: [], photos: [] });
  }

  const { data: teamRows, error: teamError } = await supabase
    .from('teams')
    .select('id, name')
    .eq('rallye_id', rallyeId);

  if (teamError) {
    console.error('Error fetching rallye teams:', teamError);
    return fail('Teams konnten nicht geladen werden');
  }

  const teams = (teamRows || []) as UploadPhotoTeam[];
  const teamIds = teams.map((team) => team.id);
  const questionIds = questions.map((question) => question.id);

  let teamQuestionRows: TeamQuestionRow[] = [];
  if (teamIds.length > 0) {
    const { data: teamQuestionData, error: teamQuestionError } = await supabase
      .from('team_answers')
      .select('id, team_id, question_id, answer')
      .in('question_id', questionIds)
      .in('team_id', teamIds);

    if (teamQuestionError) {
      console.error('Error fetching team answers:', teamQuestionError);
      return fail('Upload-Antworten konnten nicht geladen werden');
    }

    teamQuestionRows = (teamQuestionData || []) as TeamQuestionRow[];
  }

  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const photos: UploadPhotoRef[] = [];

  teamQuestionRows.forEach((row) => {
    const fileName = (row.answer ?? '').trim();
    if (!fileName) return;
    const team = teamsById.get(row.team_id);
    if (!team) return;
    photos.push({
      teamQuestionId: row.id,
      teamId: row.team_id,
      teamName: team.name,
      questionId: row.question_id,
      fileName,
    });
  });

  return ok({ questions, teams, photos });
}
