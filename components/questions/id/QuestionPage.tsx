'use client';
import React, { useEffect, useState } from 'react';
import QuestionForm from '@/components/questions/id/QuestionForm';
import { getQuestionById, createQuestion, updateQuestion, deleteQuestion } from '@/actions/question';
import { useParams, useRouter } from 'next/navigation';
import { Question, QuestionFormData } from '@/helpers/questions';


const QuestionPage: React.FC = () => {
    const { id } = useParams();
    const router = useRouter();
    const [initialData, setInitialData] = useState<Question | null>(null);

    useEffect(() => {
        if (id === 'new') {
            return;
        }
        if (id) {
            getQuestionById(Number(id)).then((data) => {
                if (data) {
                    setInitialData(data);
                }
            });
        }
    }, [id]);

    const handleSubmit = async (data: QuestionFormData) => {
        console.log('Submitting data:', data);
        try {
            if (id !== 'new') {
                // Update the question
                await updateQuestion(Number(id), data);
            } else {
                // Create a new question
                console.log('Creating question:', data);
                await createQuestion(data);
            }
            router.push('/questions'); // Redirect to questions list page after submission
        } catch (error) {
            console.error('Error submitting data:', error);
            // todo fehlerbehandlung
        }

    };

    const handleCancel = () => {
        router.push('/questions'); // Redirect to questions list page on cancel
    };

    const handleDelete = async () => {
        if (id && id !== 'new') {
            await deleteQuestion(Number(id));
            router.push('/questions'); // Redirect to questions list page after deletion
        }
    };

    if (!initialData && id !== 'new') {
        return (<div>Loading...</div>)
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