'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import {
  createQuestion,
  updateQuestion,
  deleteQuestion,
} from '@/actions/question';
import { Question, QuestionFormData } from '@/helpers/questions';
import type { RallyeOption } from '@/lib/types';
import QuestionForm from '@/components/questions/id/QuestionForm';

interface Props {
  id: string;
  initialData: Question | null;
  categories: string[];
  rallyes: RallyeOption[];
  initialRallyeIds: number[];
}

const QuestionPage: React.FC<Props> = ({
  id,
  initialData,
  categories,
  rallyes,
  initialRallyeIds,
}) => {
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
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
        <div className="space-y-1 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Fragen
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            {id === 'new' ? 'Neue Frage erstellen' : 'Frage bearbeiten'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {id === 'new'
              ? 'Frage formulieren, Antworten definieren und optional ein Bild hinterlegen.'
              : 'Inhalt, Antworten und Metadaten aktualisieren.'}
          </p>
        </div>
      </section>
      <section className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
        <QuestionForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          onDelete={id !== 'new' ? handleDelete : undefined}
          initialData={initialData}
          categories={categories}
          rallyes={rallyes}
          initialRallyeIds={initialRallyeIds}
        />
      </section>
    </div>
  );
};

export default QuestionPage;
