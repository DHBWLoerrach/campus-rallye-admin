'use client';
import React, { useEffect, useState } from 'react';
import QuestionForm from '@/components/questions/QuestionForm';
import { getQuestionById, createQuestion, updateQuestion, deleteQuestion } from '@/actions/question';
import { useParams, useRouter } from 'next/navigation';

const QuestionPage: React.FC = () => {
    const { id } = useParams();
    const router = useRouter();
    const [initialData, setInitialData] = useState(null);

    useEffect(() => {
        if (id === 'new') {
            return; // No need to fetch data for new questions
        }
        if (id) {
            // Fetch the question data if an ID is provided
            getQuestionById(id as number).then((data) => {
                setInitialData(data);
                console.log('Initial data from Main:', initialData);
            });
        } else {
            setInitialData({
                content: '',
                type: '',
                enabled: false,
                points: 0,
                hint: '',
                category: '',
                answers: [{}]
              });
        }
    }, [id]);

    const handleSubmit = async (data: any) => {
        console.log('Submitting data:', data);
        if (id !== 'new') {
            // Update the question
            await updateQuestion(id as number, data);
        } else {
            // Create a new question
            await createQuestion(data);
        }
        router.push('/questions'); // Redirect to questions list page after submission
    };

    const handleCancel = () => {
        router.push('/questions'); // Redirect to questions list page on cancel
    };

        const handleDelete = async () => {
        if (id && id !== 'new') {
          await deleteQuestion(id as number);
          router.push('/questions'); // Redirect to questions list page after deletion
        }
      }; 
    
    if (!initialData && id !== 'new') {
        return <div>Loading...</div>; // Zeigen Sie einen Ladeindikator an, während die Daten abgerufen werden
      }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl mb-4">{id === 'new' ? 'Neue Frage erstellen' : 'Frage bearbeiten'}</h1>
            <QuestionForm 
            onSubmit={handleSubmit} 
            onCancel={handleCancel} 
            onDelete={id !== 'new' ? handleDelete : undefined}
            initialData={initialData} />
        </div>
    );
};

export default QuestionPage;