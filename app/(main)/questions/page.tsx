import { NextPage } from 'next';
import QuestionsManagement from '@/components/questions/QuestionsManagement';

const Questions: NextPage = () => {
  return (
    <main className="m-4">
      <QuestionsManagement />
    </main>
  );
};

export default Questions;
