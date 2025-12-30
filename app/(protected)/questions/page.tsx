import QuestionsManagement from '@/components/questions/QuestionsManagement';
import { getQuestions, getCategories } from '@/actions/question';
import { getRallyeOptions } from '@/actions/rallye';

export default async function Questions() {
  const [questions, categories, rallyes] = await Promise.all([
    getQuestions({}),
    getCategories(),
    getRallyeOptions(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6">
      <QuestionsManagement
        initialQuestions={questions}
        categories={categories}
        rallyes={rallyes}
      />
    </main>
  );
}
