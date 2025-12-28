import QuestionsManagement from '@/components/questions/QuestionsManagement';
import { getQuestions, getCategories } from '@/actions/question';

export default async function Questions() {
  const [questions, categories] = await Promise.all([
    getQuestions({}),
    getCategories(),
  ]);

  return (
    <main className="m-4">
      <QuestionsManagement
        initialQuestions={questions}
        categories={categories}
      />
    </main>
  );
}
