import { NextPage } from 'next';
import QuestionPage from '@/components/questions/id/QuestionPage';

const Question: NextPage = () => {
  return (
    <main className="m-4">
      <QuestionPage />
    </main>
  );
};

export default Question;
