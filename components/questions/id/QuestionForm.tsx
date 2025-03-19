import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { questionTypes } from '@/helpers/questionTypes';
import { Answer, Question, QuestionFormData } from '@/helpers/questions';
import { getCategories } from '@/actions/question';
import Image from 'next/image';
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
  category?: string;
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
    enabled: initialData?.enabled || false,
    points: initialData?.points || 0,
    hint: initialData?.hint,
    category: initialData?.category,
    bucket_path: initialData?.bucket_path,
    answers: initialData?.answers || [{ id: 0, correct: false, text: '' }],
  });

  const [categories, setCategories] = useState<string[]>([]);
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    const loadCategories = async () => {
      const fetchedCategories = await getCategories();
      setCategories(fetchedCategories);
    };
    loadCategories();
  }, []);

  const handleFormChange = (field: keyof QuestionFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCategoryChange = (value: string) => {
    if (value === 'new') {
      setIsNewCategory(true);
      setFormData((prev) => ({ ...prev, category: '' }));
    } else if (value === 'none') {
      // neue Bedingung für neutralen Zustand
      setIsNewCategory(false);
      setFormData((prev) => ({ ...prev, category: undefined }));
    } else {
      setIsNewCategory(false);
      setFormData((prev) => ({ ...prev, category: value }));
    }
  };

  const handleAnswerChange = (index: number, field: string, value: any) => {
    const newAnswers = [...(formData.answers || [])];
    newAnswers[index] = { ...newAnswers[index], [field]: value };
    setFormData({
      ...formData,
      answers: newAnswers,
    });
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

    if (!data.category?.trim() && isNewCategory) {
      newErrors.category =
        'Bitte wählen Sie eine Kategorie oder geben Sie eine neue ein';
    }

    if ((data.points ?? 0) < 0) {
      newErrors.points = 'Punkte müssen größer oder gleich 0 sein';
    }

    const validAnswers = data.answers?.filter((a) => a.text?.trim());
    if (validAnswers?.length === 0) {
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

        <div className="flex items-center space-x-4 space-y-2">
          <Label htmlFor="enabled">Aktiviert*</Label>
          <Switch
            id="enabled"
            checked={formData.enabled}
            onCheckedChange={(checked) => handleFormChange('enabled', checked)}
          />
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

        <div className="space-y-2">
          <Label htmlFor="category">Kategorie</Label>
          <Select
            value={isNewCategory ? 'new' : formData.category || ''}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
              <SelectValue placeholder="Wählen Sie eine Kategorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Bitte auswählen</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
              <SelectItem value="new">+ Neue Kategorie</SelectItem>
            </SelectContent>
          </Select>
          {isNewCategory && (
            <Input
              type="text"
              value={formData.category}
              placeholder="Neue Kategorie eingeben"
              className="mt-2"
              onChange={(e) => handleFormChange('category', e.target.value)}
            />
          )}
          {errors.category && (
            <span className="text-sm text-red-500">{errors.category}</span>
          )}
        </div>

        <QuestionImage
          bucketPath={formData.bucket_path}
          onImageChange={(newPath) => handleFormChange('bucket_path', newPath)}
        />

        <div className="space-y-2">
          <Label>Antworten*</Label>
          {formData.answers?.map((answer, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Checkbox
                checked={answer.correct}
                onCheckedChange={(checked) =>
                  handleAnswerChange(index, 'correct', checked)
                }
              />
              <Input
                type="text"
                value={answer.text}
                onChange={(e) =>
                  handleAnswerChange(index, 'text', e.target.value)
                }
                placeholder="Füge eine Antwort hinzu"
                className={
                  errors.answers
                    ? 'border-red-500 border p-2 flex-2'
                    : 'border p-2 flex-2'
                }
              />
              <Button
                type="button"
                onClick={() => removeAnswer(index)}
                className="bg-red-600 text-white"
              >
                -
              </Button>
            </div>
          ))}
          <Button
            type="button"
            onClick={addAnswer}
            className="bg-green-600 text-white"
          >
            + Antwort
          </Button>
          {errors.answers && (
            <span className="m-5 text-sm text-red-500">{errors.answers}</span>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button type="submit" className="bg-blue-600 text-white">
            Speichern
          </Button>
          {onDelete && (
            <Button
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
              className="bg-red-600 text-white"
            >
              Löschen
            </Button>
          )}
        </div>
      </div>
    </form>
  );
};

export default QuestionForm;
