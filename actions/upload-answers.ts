'use server';

import createClient from '@/lib/supabase';
import { requireProfile } from '@/lib/require-profile';
import { fail, ok, type ActionResult } from '@/lib/action-result';
import {
  UPLOAD_PHOTOS_BUCKET,
  loadRallyeUploadPhotos,
  type UploadPhotoTeam,
} from '@/lib/rallye-upload-photos';
import { formatZodError, idSchema } from '@/lib/validation';

export type UploadAnswerTeam = UploadPhotoTeam;

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
  uploadAnswers: UploadAnswer[];
  teamsWithoutPhoto: UploadAnswerTeam[];
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
    .from('rallyes')
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

  const loaded = await loadRallyeUploadPhotos(supabase, rallyeIdResult.data);
  if (!loaded.success) {
    return loaded;
  }
  const { questions, teams, photos } = loaded.data!;

  if (questions.length === 0) {
    return ok([]);
  }

  const answersByQuestionId = new Map<number, UploadAnswer[]>();
  const answeredTeamsByQuestionId = new Map<number, Set<number>>();

  if (photos.length > 0) {
    const storage = supabase.storage.from(UPLOAD_PHOTOS_BUCKET);
    const signedAnswers = await Promise.all(
      photos.map(async (candidate) => {
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

  const result: UploadAnswerQuestion[] = questions.map((question) => {
    const answeredTeams =
      answeredTeamsByQuestionId.get(question.id) ?? new Set<number>();
    const teamsWithoutPhoto = teams.filter(
      (team) => !answeredTeams.has(team.id)
    );
    return {
      id: question.id,
      content: question.content,
      uploadAnswers: answersByQuestionId.get(question.id) ?? [],
      teamsWithoutPhoto,
    };
  });

  return ok(result);
}
