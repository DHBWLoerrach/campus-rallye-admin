import QuestionPage from '@/components/questions/id/QuestionPage';
import { NextPage } from 'next';
import dynamic from 'next/dynamic';
import RallyeQuestionsPage from '@/components/rallye_questions/RallyeQuestionsPage';

const RallyeQuestions: NextPage = () => {
    return (
    <main className="m-4">
        <RallyeQuestionsPage/>
    </main>
    )
};

export default RallyeQuestions;