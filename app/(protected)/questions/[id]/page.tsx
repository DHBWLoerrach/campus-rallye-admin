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

  const [question, categories, rallyesResult, assignedRallyes] = await Promise.all([
    isNew ? Promise.resolve(null) : getQuestionById(Number(id)),
    getCategories(),
    getRallyeOptions(),
    isNew ? Promise.resolve([]) : getQuestionRallyes(Number(id)),
  ]);
  const rallyes = rallyesResult.success ? rallyesResult.data ?? [] : [];

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
