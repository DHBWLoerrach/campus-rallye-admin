import QuestionsManagement from '@/components/questions/QuestionsManagement';
import { getQuestions, getCategories } from '@/actions/question';

export default async function Questions() {
  const [questions, categories] = await Promise.all([
    getQuestions({}),
    getCategories(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6">
      <QuestionsManagement
        initialQuestions={questions}
        categories={categories}
      />
    </main>
  );
}
