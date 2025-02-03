import QuestionPage from '@/components/questions/QuestionPage';
import { NextPage } from 'next';
import dynamic from 'next/dynamic';

const Question: NextPage = () => {
    return (
    <main className="m-4">
        <QuestionPage/>;
    </main>
    )
};

export default Question;