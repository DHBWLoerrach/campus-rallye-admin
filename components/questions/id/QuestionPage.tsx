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
import { Button } from '@/components/ui/button';
import { QrCode } from 'lucide-react';
import QRCodeGenerator from '../QRCodeGenerator';

const QuestionPage: React.FC = () => {
  const { id } = useParams();
  const router = useRouter();
  const [initialData, setInitialData] = useState<Question | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);

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
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl">
          {id === 'new' ? 'Neue Frage erstellen' : 'Frage bearbeiten'}
        </h1>
        {id !== 'new' && initialData && (
          <Button
            variant="outline"
            onClick={() => setShowQRCode(true)}
          >
            <QrCode className="w-4 h-4 mr-2" />
            QR-Code generieren
          </Button>
        )}
      </div>
      <QuestionForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        onDelete={id !== 'new' ? handleDelete : undefined}
        initialData={initialData}
      />
      
      {/* QR Code Generator */}
      {initialData && (
        <QRCodeGenerator
          questionId={initialData.id}
          questionContent={initialData.content}
          isOpen={showQRCode}
          onClose={() => setShowQRCode(false)}
        />
      )}
    </div>
  );
};

export default QuestionPage;
