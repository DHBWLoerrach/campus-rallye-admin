'use server';

import createClient from '@/lib/supabase';
import { requireProfile } from '@/lib/require-profile';
import { fail, ok, type ActionResult } from '@/lib/action-result';
import { formatZodError, idSchema } from '@/lib/validation';

export type UploadAnswerTeam = {
  id: number;
  name: string;
};

export type UploadAnswer = {
  teamQuestionId: number;
  teamId: number;
  teamName: string;
  fileName: string;
  signedUrl: string;
};

export type UploadAnswerQuestion = {
  id: number;
  content: string;
  answers: UploadAnswer[];
  teamsWithoutPhoto: UploadAnswerTeam[];
};

type UploadQuestionRow = {
  question_id: number;
  questions?:
    | { id: number; content: string; type: string }
    | { id: number; content: string; type: string }[];
};

type TeamRow = {
  id: number;
  name: string;
};

type TeamQuestionRow = {
  id: number;
  team_id: number;
  question_id: number;
  team_answer: string | null;
};

type AnswerCandidate = {
  teamQuestionId: number;
  teamId: number;
  teamName: string;
  questionId: number;
  fileName: string;
};

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function getRallyeUploadAnswers(
  rallyeId: number
): Promise<ActionResult<UploadAnswerQuestion[]>> {
  await requireProfile();
  const rallyeIdResult = idSchema.safeParse(rallyeId);
  if (!rallyeIdResult.success) {
    return fail('Ungültige Rallye-ID', formatZodError(rallyeIdResult.error));
  }

  const supabase = await createClient();

  const { data: existingRallye, error: rallyeError } = await supabase
    .from('rallye')
    .select('id')
    .eq('id', rallyeIdResult.data)
    .maybeSingle();

  if (rallyeError) {
    console.error('Error checking rallye:', rallyeError);
    return fail('Rallye konnte nicht geladen werden');
  }

  if (!existingRallye) {
    return fail('Rallye nicht gefunden');
  }

  const { data: uploadQuestionRows, error: uploadQuestionError } =
    await supabase
      .from('join_rallye_questions')
      .select('question_id, questions!inner(id, content, type)')
      .eq('rallye_id', rallyeIdResult.data)
      .eq('questions.type', 'upload');

  if (uploadQuestionError) {
    console.error('Error fetching upload questions:', uploadQuestionError);
    return fail('Upload-Fragen konnten nicht geladen werden');
  }

  const uploadQuestions = (uploadQuestionRows || [])
    .map((row) => row as UploadQuestionRow)
    .map((row) => {
      if (!row.questions) return null;
      return Array.isArray(row.questions) ? row.questions[0] : row.questions;
    })
    .filter(
      (question): question is { id: number; content: string; type: string } =>
        !!question
    );

  if (uploadQuestions.length === 0) {
    return ok([]);
  }

  const { data: teamRows, error: teamError } = await supabase
    .from('rallye_team')
    .select('id, name')
    .eq('rallye_id', rallyeIdResult.data);

  if (teamError) {
    console.error('Error fetching rallye teams:', teamError);
    return fail('Teams konnten nicht geladen werden');
  }

  const teams = (teamRows || []) as TeamRow[];
  const teamIds = teams.map((team) => team.id);
  const questionIds = uploadQuestions.map((question) => question.id);

  let teamQuestionRows: TeamQuestionRow[] = [];
  if (teamIds.length > 0 && questionIds.length > 0) {
    const { data: teamQuestionData, error: teamQuestionError } = await supabase
      .from('team_questions')
      .select('id, team_id, question_id, team_answer')
      .in('question_id', questionIds)
      .in('team_id', teamIds);

    if (teamQuestionError) {
      console.error('Error fetching team answers:', teamQuestionError);
      return fail('Upload-Antworten konnten nicht geladen werden');
    }

    teamQuestionRows = (teamQuestionData || []) as TeamQuestionRow[];
  }

  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const answerCandidates: AnswerCandidate[] = [];

  teamQuestionRows.forEach((row) => {
    const fileName = (row.team_answer ?? '').trim();
    if (!fileName) return;
    const team = teamsById.get(row.team_id);
    if (!team) return;
    answerCandidates.push({
      teamQuestionId: row.id,
      teamId: row.team_id,
      teamName: team.name,
      questionId: row.question_id,
      fileName,
    });
  });

  const answersByQuestionId = new Map<number, UploadAnswer[]>();
  const answeredTeamsByQuestionId = new Map<number, Set<number>>();

  if (answerCandidates.length > 0) {
    const storage = supabase.storage.from('upload-photos');
    const signedAnswers = await Promise.all(
      answerCandidates.map(async (candidate) => {
        const { data, error } = await storage.createSignedUrl(
          candidate.fileName,
          SIGNED_URL_TTL_SECONDS
        );
        if (error || !data?.signedUrl) {
          console.error('Error creating signed url:', {
            teamId: candidate.teamId,
            questionId: candidate.questionId,
            fileName: candidate.fileName,
            error,
          });
          return null;
        }
        return { ...candidate, signedUrl: data.signedUrl };
      })
    );

    signedAnswers.forEach((answer) => {
      if (!answer) return;
      const answers = answersByQuestionId.get(answer.questionId) ?? [];
      answers.push({
        teamQuestionId: answer.teamQuestionId,
        teamId: answer.teamId,
        teamName: answer.teamName,
        fileName: answer.fileName,
        signedUrl: answer.signedUrl,
      });
      answersByQuestionId.set(answer.questionId, answers);
      const answeredTeams =
        answeredTeamsByQuestionId.get(answer.questionId) ?? new Set<number>();
      answeredTeams.add(answer.teamId);
      answeredTeamsByQuestionId.set(answer.questionId, answeredTeams);
    });
  }

  const result: UploadAnswerQuestion[] = uploadQuestions.map((question) => {
    const answeredTeams =
      answeredTeamsByQuestionId.get(question.id) ?? new Set<number>();
    const teamsWithoutPhoto = teams.filter(
      (team) => !answeredTeams.has(team.id)
    );
    return {
      id: question.id,
      content: question.content,
      answers: answersByQuestionId.get(question.id) ?? [],
      teamsWithoutPhoto,
    };
  });

  return ok(result);
}
