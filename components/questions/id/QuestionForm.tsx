import React, { useEffect, useState } from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { questionTypes } from '@/helpers/questionTypes';
import { Question, QuestionFormData } from '@/helpers/questions';
import QuestionImage from './QuestionImage';

interface QuestionFormProps {
  initialData?: Partial<Question> | null;
  onSubmit: (data: QuestionFormData) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

interface FormErrors {
  content?: string;
  type?: string;
  points?: string;
  answers?: string;
}

const QuestionForm: React.FC<QuestionFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  onDelete,
}) => {
  const [formData, setFormData] = useState<QuestionFormData>({
    content: initialData?.content || '',
    type: initialData?.type || '',
    points: initialData?.points || 0,
    hint: initialData?.hint,
    category: initialData?.category,
    bucket_path: initialData?.bucket_path,
    answers: initialData?.answers || [{ id: 0, correct: true, text: '' }],
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const handleFormChange = (field: keyof QuestionFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };


  const handleAnswerChange = (index: number, field: string, value: any) => {
    const newAnswers = [...(formData.answers || [])];
    newAnswers[index] = { ...newAnswers[index], [field]: value };

    // Wenn eine Antwort als korrekt markiert wird, setze alle anderen auf inkorrekt
    if (
      formData.type === 'multiple_choice' &&
      field === 'correct' &&
      value === true
    ) {
      newAnswers.forEach((answer, i) => {
        if (i !== index) {
          answer.correct = false;
        }
      });
    }

    setFormData({
      ...formData,
      answers: newAnswers,
    });
  };

  // Helper-Funktion, um den Index der korrekten Antwort zu finden
  const getCorrectAnswerIndex = () => {
    return formData.answers?.findIndex((answer) => answer.correct) ?? -1;
  };

  // Helper-Funktion, um die korrekte Antwort via Index zu setzen
  const handleCorrectAnswerSelect = (selectedIndexStr: string) => {
    const selectedIndex = parseInt(selectedIndexStr, 10);
    if (isNaN(selectedIndex)) return;

    const newAnswers =
      formData.answers?.map((answer, index) => ({
        ...answer,
        correct: index === selectedIndex,
      })) || [];

    setFormData((prev) => ({
      ...prev,
      answers: newAnswers,
    }));
  };

  const addAnswer = () => {
    setFormData((prev) => ({
      ...prev,
      answers: [...(prev.answers || []), { id: 0, correct: false, text: '' }],
    }));
  };

  const removeAnswer = (index: number) => {
    if (formData.answers?.length === 1) {
      setFormData((prev) => ({
        ...prev,
        answers: [{ id: 0, correct: false, text: '' }],
      }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      answers: prev.answers?.filter((_, i) => i !== index),
    }));
  };

  const validateForm = (data: QuestionFormData): boolean => {
    const newErrors: FormErrors = {};

    if (!data.content.trim()) {
      newErrors.content = 'Bitte geben Sie eine Frage ein';
    }

    if (!data.type) {
      newErrors.type = 'Bitte wählen Sie einen Fragetyp';
    }

    if ((data.points ?? 0) < 0) {
      newErrors.points = 'Punkte müssen größer oder gleich 0 sein';
    }

    const validAnswers = data.answers?.filter((a) => a.text?.trim());
    if (formData.type !== 'upload' && validAnswers?.length === 0) {
      newErrors.answers = 'Mindestens eine Antwort muss eingegeben werden';
    }
    console.log(newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Remove empty answers
    const cleanedData = {
      ...formData,
      answers: formData.answers?.filter((answer) => answer.text?.trim()),
    };

    if (!validateForm(cleanedData)) {
      return;
    }
    console.log(cleanedData);
    onSubmit(cleanedData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="question">Frage*</Label>
          <Input
            id="question"
            value={formData.content}
            onChange={(e) => handleFormChange('content', e.target.value)}
            placeholder="Geben Sie die Frage ein"
            className={`border p-2 w-full ${
              errors.content ? 'border-red-500' : ''
            }`}
          />
          {errors.content && (
            <span className="text-sm text-red-500">{errors.content}</span>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Fragetyp*</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => handleFormChange('type', value)}
            disabled={initialData?.id !== undefined}
          >
            <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
              <SelectValue placeholder="Wählen Sie einen Fragetyp" />
            </SelectTrigger>
            <SelectContent>
              {questionTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.type && (
            <span className="text-sm text-red-500">{errors.type}</span>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="points">Punkte</Label>
          <Input
            type="number"
            id="points"
            value={formData.points}
            onChange={(e) => handleFormChange('points', Number(e.target.value))}
            placeholder="Enter points"
            className={`border p-2 w-full ${
              errors.points ? 'border-red-500' : ''
            }`}
          />
          {errors.points && (
            <span className="text-sm text-red-500">{errors.points}</span>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="hint">Hinweis</Label>
          <Input
            id="hint"
            value={formData.hint}
            onChange={(e) => handleFormChange('hint', e.target.value)}
            placeholder="Geben Sie einen Hinweis ein"
            className="border p-2 w-full"
          />
        </div>
        {formData.type === 'picture' && (
          <QuestionImage
            bucketPath={formData.bucket_path}
            onImageChange={(newPath) =>
              handleFormChange('bucket_path', newPath)
            }
          />
        )}

        {formData.type !== 'upload' && (
          <div className="space-y-2">
            <Label>
              {formData.type === 'multiple_choice' ? 'Antworten*' : 'Antwort*'}
            </Label>
            {formData.type === 'multiple_choice' ? (
              <RadioGroup
                value={getCorrectAnswerIndex().toString()}
                onValueChange={handleCorrectAnswerSelect}
                className="space-y-2"
              >
                {formData.answers?.map((answer, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <RadioGroupItem
                      value={index.toString()}
                      id={`answer-${index}`}
                    />
                    <Label htmlFor={`answer-${index}`} className="flex-1">
                      <Input
                        type="text"
                        value={answer.text}
                        onChange={(e) =>
                          handleAnswerChange(index, 'text', e.target.value)
                        }
                        placeholder="Füge eine Antwort hinzu"
                        className={
                          errors.answers
                            ? 'border-red-500 border p-2 w-full'
                            : 'border p-2 w-full'
                        }
                      />
                    </Label>
                    <Button
                      type="button"
                      onClick={() => removeAnswer(index)}
                      className="bg-red-600 text-white"
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              formData.answers?.map((answer, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    type="text"
                    value={answer.text}
                    onChange={(e) =>
                      handleAnswerChange(index, 'text', e.target.value)
                    }
                    placeholder="Füge eine Antwort hinzu"
                    className={
                      errors.answers
                        ? 'border-red-500 border p-2 flex-1'
                        : 'border p-2 flex-1'
                    }
                  />
                </div>
              ))
            )}

            {formData.type === 'multiple_choice' && (
              <Button
                type="button"
                onClick={addAnswer}
                className="bg-green-600 text-white"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Antwort
              </Button>
            )}
            {errors.answers && (
              <span className="m-5 text-sm text-red-500">{errors.answers}</span>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button type="submit" /*className="bg-blue-600 text-white"*/ variant="dhbwStyle">
            Speichern
          </Button>
          {onDelete && (
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    'Sind Sie sicher, dass Sie diese Frage löschen möchten?'
                  )
                ) {
                  onDelete();
                }
              }}
              className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Löschen
            </Button>
          )}
        </div>
      </div>
    </form>
  );
};

export default QuestionForm;
