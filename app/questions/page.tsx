import { NextPage } from 'next';
import QuestionsManagement from '@/components/QuestionsManagement';
import dynamic from 'next/dynamic';

const Questions: NextPage = () => {
  return (
    <main className='m-4'>
      <QuestionsManagement />
    </main>
  )
};

export default Questions;
