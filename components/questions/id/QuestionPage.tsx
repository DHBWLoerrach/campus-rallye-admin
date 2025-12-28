'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import {
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from '@/actions/question';
import { Question, QuestionFormData } from '@/helpers/questions';
import QuestionForm from '@/components/questions/id/QuestionForm';

interface Props {
  id: string;
  initialData: Question | null;
  categories: string[];
}

const QuestionPage: React.FC<Props> = ({ id, initialData, categories }) => {
  const router = useRouter();

  const handleSubmit = async (data: QuestionFormData) => {
    try {
      if (id !== 'new') {
        await updateQuestion(Number(id), {
          ...data,
          answers: data.answers || [],
        });
      } else {
        await createQuestion({
          ...data,
          answers: data.answers || [],
        });
      }
      router.push('/questions');
    } catch (error) {
      console.error('Error submitting data:', error);
      // todo return error message
    }
  };

  const handleCancel = () => {
    router.push('/questions');
  };

  const handleDelete = async () => {
    if (id && id !== 'new') {
      await deleteQuestion(Number(id));
      router.push('/questions');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl mb-4">
        {id === 'new' ? 'Neue Frage erstellen' : 'Frage bearbeiten'}
      </h1>
      <QuestionForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        onDelete={id !== 'new' ? handleDelete : undefined}
        initialData={initialData}
        categories={categories}
      />
    </div>
  );
};

export default QuestionPage;
