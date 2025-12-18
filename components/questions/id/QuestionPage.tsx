'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from '@/actions/question';
import { Question, QuestionFormData } from '@/helpers/questions';
import QuestionForm from '@/components/questions/id/QuestionForm';

const QuestionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
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

  if (!initialData && id !== 'new') {
    return <div>Loading...</div>;
  }

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
      />
    </div>
  );
};

export default QuestionPage;
