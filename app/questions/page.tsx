import { NextPage } from 'next';
import QuestionsManagement from '@/components/QuestionsManagement';
import dynamic from 'next/dynamic';

const Questions: NextPage = () => {
  return <QuestionsManagement />;
};

export default Questions;
