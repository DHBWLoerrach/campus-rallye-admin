import QuestionPage from '@/components/questions/id/QuestionPage';
import { getQuestionById, getCategories } from '@/actions/question';
import { getRallyeOptions } from '@/actions/rallye';
import { getQuestionRallyes } from '@/actions/assign_questions_to_rallye';
import { copyQuestionForCreation } from '@/helpers/questions';
import {
  parseQuestionCopyContext,
  QUESTION_COPY_FROM_PARAM,
} from '@/lib/question-copy-context';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Question({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const isNew = id === 'new';
  const copyContext = isNew
    ? parseQuestionCopyContext(query[QUESTION_COPY_FROM_PARAM])
    : { kind: 'none' as const };
  const copyFromId =
    copyContext.kind === 'copy' ? copyContext.questionId : undefined;
  const requestedQuestionId = isNew ? copyFromId : Number(id);

  const [
    questionResult,
    categoriesResult,
    rallyesResult,
    assignedRallyesResult,
  ] = await Promise.all([
    requestedQuestionId
      ? getQuestionById(requestedQuestionId)
      : Promise.resolve(null),
    getCategories(),
    getRallyeOptions(),
    isNew ? Promise.resolve(null) : getQuestionRallyes(Number(id)),
  ]);

  if (questionResult && !questionResult.success) {
    console.error(questionResult.error);
  }
  if (!categoriesResult.success) {
    console.error(categoriesResult.error);
  }
  if (!rallyesResult.success) {
    console.error(rallyesResult.error);
  }
  if (assignedRallyesResult && !assignedRallyesResult.success) {
    console.error(assignedRallyesResult.error);
  }

  const loadedQuestion =
    questionResult && questionResult.success
      ? (questionResult.data ?? null)
      : null;
  const isCopy = isNew && copyFromId !== undefined && loadedQuestion !== null;
  const copyError =
    copyContext.kind === 'invalid'
      ? 'Die Kopiervorlage ist ungültig. Es wurde ein leeres Formular geöffnet.'
      : copyContext.kind === 'copy' && loadedQuestion === null
        ? 'Die Kopiervorlage konnte nicht geladen werden. Es wurde ein leeres Formular geöffnet.'
        : null;
  const question =
    isCopy && loadedQuestion
      ? copyQuestionForCreation(loadedQuestion)
      : loadedQuestion;
  const categories = categoriesResult.success
    ? (categoriesResult.data ?? [])
    : [];
  const rallyes = rallyesResult.success ? (rallyesResult.data ?? []) : [];
  const assignedRallyes =
    assignedRallyesResult && assignedRallyesResult.success
      ? (assignedRallyesResult.data ?? [])
      : [];

  return (
    <main className="mx-auto flex w-full max-w-350 flex-col gap-6 px-4 py-6">
      <QuestionPage
        id={id}
        initialData={question}
        isCopy={isCopy}
        copyError={copyError}
        categories={categories}
        rallyes={rallyes}
        initialRallyeIds={assignedRallyes}
      />
    </main>
  );
}
