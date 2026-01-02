import QuestionPage from '@/components/questions/id/QuestionPage';
import { getQuestionById, getCategories } from '@/actions/question';
import { getRallyeOptions } from '@/actions/rallye';
import { getQuestionRallyes } from '@/actions/assign_questions_to_rallye';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function Question({ params }: Props) {
  const { id } = await params;
  const isNew = id === 'new';

  const [
    questionResult,
    categoriesResult,
    rallyesResult,
    assignedRallyesResult,
  ] = await Promise.all([
    isNew ? Promise.resolve(null) : getQuestionById(Number(id)),
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

  const question =
    questionResult && questionResult.success ? questionResult.data ?? null : null;
  const categories = categoriesResult.success
    ? categoriesResult.data ?? []
    : [];
  const rallyes = rallyesResult.success ? rallyesResult.data ?? [] : [];
  const assignedRallyes =
    assignedRallyesResult && assignedRallyesResult.success
      ? assignedRallyesResult.data ?? []
      : [];

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6">
      <QuestionPage
        id={id}
        initialData={question}
        categories={categories}
        rallyes={rallyes}
        initialRallyeIds={assignedRallyes}
      />
    </main>
  );
}
