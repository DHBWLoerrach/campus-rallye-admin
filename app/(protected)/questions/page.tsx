import QuestionsManagement from '@/components/questions/QuestionsManagement';
import { getQuestions, getCategories } from '@/actions/question';
import { getRallyeOptions } from '@/actions/rallye';
import { getQuestionRallyeMap } from '@/actions/assign_questions_to_rallye';

export default async function Questions() {
  const [questionsResult, categoriesResult, rallyesResult] = await Promise.all([
    getQuestions({}),
    getCategories(),
    getRallyeOptions(),
  ]);
  if (!questionsResult.success) {
    console.error(questionsResult.error);
  }
  if (!categoriesResult.success) {
    console.error(categoriesResult.error);
  }
  if (!rallyesResult.success) {
    console.error(rallyesResult.error);
  }

  const questions = questionsResult.success ? questionsResult.data ?? [] : [];
  const categories = categoriesResult.success
    ? categoriesResult.data ?? []
    : [];
  const rallyes = rallyesResult.success ? rallyesResult.data ?? [] : [];
  const initialRallyeMapResult = await getQuestionRallyeMap(
    questions.map((question) => question.id)
  );
  if (!initialRallyeMapResult.success) {
    console.error(initialRallyeMapResult.error);
  }
  const initialRallyeMap = initialRallyeMapResult.success
    ? initialRallyeMapResult.data ?? {}
    : {};
  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6">
      <QuestionsManagement
        initialQuestions={questions}
        categories={categories}
        rallyes={rallyes}
        initialRallyeMap={initialRallyeMap}
      />
    </main>
  );
}
