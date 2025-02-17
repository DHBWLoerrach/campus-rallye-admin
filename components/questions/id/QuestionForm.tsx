import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { questionTypes } from '@/helpers/questionTypes';
import { Answer, Question, QuestionFormData } from '@/helpers/questions';
import { add, set } from 'date-fns';

interface QuestionFormProps {
  initialData?: Partial<Question> | null;
  onSubmit: (data: QuestionFormData) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

const QuestionForm: React.FC<QuestionFormProps> = ({ initialData = {}, onSubmit, onCancel, onDelete }) => { 
  const [formData, setFormData] = useState<QuestionFormData>({
    content: initialData?.content || '',
    type: initialData?.type || '',
    enabled: initialData?.enabled || false,
    points: initialData?.points || 0,
    hint: initialData?.hint,
    category: initialData?.category,
    answers: initialData?.answers || [{ correct: false, text: '' }]
  });

  const handleFormChange = (field: keyof QuestionFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAnswerChange = (index: number, field: string, value: any) => {
    const newAnswers = [...formData.answers];
    newAnswers[index] = { ...newAnswers[index], [field]: value };
    setFormData({
      ...formData,
      answers: newAnswers
    });
  };

  const addAnswer = () => {
    setFormData(prev => ({
      ...prev,
      answers: [...prev.answers, { correct: false, text: '' }]
    }));
  };

  const removeAnswer = (index: number) => {
    if (formData.answers.length === 1) {
      setFormData(prev => ({
        ...prev,
        answers: [{ correct: false, text: '' }]
      }));
      return;
    }
    setFormData(prev => ({
      ...prev,
      answers: prev.answers.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (data: QuestionFormData): boolean => {
    if (!data.content.trim()) return false;
    if (!data.type) return false;
    // if (!data.category?.trim()) return false;
    // if (data.points < 0) return false;
    
    // Mindestens eine gültige Antwort muss vorhanden sein
    const validAnswers = data.answers.filter(a => a.text.trim());
    if (validAnswers.length === 0) return false;

    return true;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Entferne leere Antworten
    const cleanedData = {
      ...formData,
      answers: formData.answers.filter(answer => answer.text.trim())
    };
    // todo wenn irgendwo ein leerer String ist das Feld auf
    // undefined setzen?

    if (!validateForm(cleanedData)) {
      // Hier könnte eine Fehlermeldung angezeigt werden
      // was falsch ist
      console.error('Ungültige Formulardaten');
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
            className="border p-2 w-full"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Fragetyp*</Label>
          <Select value={formData.type} onValueChange={(value) => handleFormChange('type', value)}>
            <SelectTrigger>
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
        </div>
        <div className="flex items-center space-x-4 space-y-2">
          <Label htmlFor="enabled">Aktiviert*</Label>
          <Switch id="enabled" checked={formData.enabled} onCheckedChange={(checked) => handleFormChange('enabled', checked)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="points">Punkte</Label>
          <Input
            type="number"
            id="points"
            value={formData.points}
            onChange={(e) => handleFormChange('points', Number(e.target.value))}
            placeholder="Enter points"
            className="border p-2 w-full"
          />
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
          <Input
            id="category"
            value={formData.category}
            onChange={(e) => handleFormChange('category', e.target.value)}
            placeholder="Geben Sie eine Kategorie ein"
            className="border p-2 w-full"
          />
        </div>
        <div className="space-y-2">
          <Label>Antworten*</Label>
          {formData.answers.map((answer, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Checkbox
                checked={answer.correct}
                onCheckedChange={(checked) => handleAnswerChange(index, 'correct', checked)}
              />
              <Input
                type="text"
                value={answer.text}
                onChange={(e) => handleAnswerChange(index, 'text', e.target.value)}
                placeholder="Füge eine Antwort hinzu"
                className="border p-2 flex-2"
              />
              <Button type="button" onClick={() => removeAnswer(index)} className="bg-red-600 text-white">
                -
              </Button>
            </div>
          ))}
          <Button type="button" onClick={addAnswer} className="bg-green-600 text-white">
            + Antwort
          </Button>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button type="submit" className="bg-blue-600 text-white">
            Speichern
          </Button>
          {onDelete && (
            <Button type="button" onClick={onDelete} className="bg-red-600 text-white">
              Löschen
            </Button>
          )}
        </div>
      </div>
    </form>
  );
};

export default QuestionForm;