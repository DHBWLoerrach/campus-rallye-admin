import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { questionTypes } from './helpers';

interface Answer {
  id?: number;
  correct: boolean;
  text?: string;
}

interface QuestionFormProps {
  initialData?: Partial<Record<string, any>>;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

const QuestionForm: React.FC<QuestionFormProps> = ({ initialData = {}, onSubmit, onCancel, onDelete }) => {
  const [question, setQuestion] = useState(initialData?.content || '');
  const [type, setType] = useState(initialData?.type || 'text');
  const [enabled, setEnabled] = useState(initialData?.enabled || false);
  const [points, setPoints] = useState(initialData?.points || 0);
  const [hint, setHint] = useState(initialData?.hint || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [answers, setAnswers] = useState<Answer[]>(initialData?.answers || [{ correct: false, text: '' }]);

  const handleAnswerChange = (index: number, field: string, value: any) => {
    const newAnswers = [...answers];
    newAnswers[index] = { ...newAnswers[index], [field]: value };
    setAnswers(newAnswers);
  };

  const addAnswer = () => {
    setAnswers([...answers, { correct: false, text: '' }]);
  };

  const removeAnswer = (index: number) => {
    setAnswers(answers.filter((_, i) => i !== index));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({ content: question, type, enabled, points, hint, category, answers });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="question">Frage</Label>
          <Input
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter your question"
            className="border p-2 w-full"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Fragetyp</Label>
          <Select value={type} onValueChange={(value) => setType(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Wählen Sie einen Fragetyp"/>
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
        <div className="space-y-2">
          <Label htmlFor="enabled">Enabled</Label>
          <Input
            type="checkbox"
            id="enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="points">Points</Label>
          <Input
            type="number"
            id="points"
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            placeholder="Enter points"
            className="border p-2 w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hint">Hint</Label>
          <Input
            id="hint"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="Enter hint"
            className="border p-2 w-full"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Enter category"
            className="border p-2 w-full"
          />
        </div>
        <div className="space-y-2">
          <Label>Answers</Label>
          {answers.map((answer, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Input
                type="text"
                value={answer.text}
                onChange={(e) => handleAnswerChange(index, 'text', e.target.value)}
                placeholder="Enter answer"
                className="border p-2 flex-2"
              />
              <Input
                type="checkbox"
                checked={answer.correct}
                onChange={(e) => handleAnswerChange(index, 'correct', e.target.checked)}
              />
              <Button type="button" onClick={() => removeAnswer(index)} className="bg-red-600 text-white">
                Remove
              </Button>
            </div>
          ))}
          <Button type="button" onClick={addAnswer} className="bg-green-600 text-white">
            Add Answer
          </Button>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="bg-blue-600 text-white">
            Submit
          </Button>
          {onDelete && (
          <Button type="button" onClick={onDelete} className="bg-red-600 text-white">
            Delete
          </Button>
        )}
        </div>
      </div>
    </form>
  );
};

export default QuestionForm;