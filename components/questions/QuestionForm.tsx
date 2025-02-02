import React, { useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface Answer {
  id?: number;
  correct: boolean;
  text?: string;
}

interface QuestionFormProps {
  initialData?: {
    content: string;
    type: string;
    enabled: boolean;
    points?: number;
    hint?: string;
    category: string;
    answers: Answer[];
  };
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const QuestionForm: React.FC<QuestionFormProps> = ({ initialData, onSubmit, onCancel }) => {
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
    <form onSubmit={handleSubmit} className="max-h-screen overflow-y-auto">
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="question">Question</Label>
          <Input
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter your question"
            className="border p-2"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="type">Type</Label>
          <Select value={type} onValueChange={(value) => setType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="multiple">Multiple Choice</SelectItem>
              <SelectItem value="location">Location</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="enabled">Enabled</Label>
          <Input
            type="checkbox"
            id="enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="points">Points</Label>
          <Input
            type="number"
            id="points"
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            placeholder="Enter points"
            className="border p-2"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="hint">Hint</Label>
          <Input
            id="hint"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="Enter hint"
            className="border p-2"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Enter category"
            className="border p-2"
          />
        </div>
        <div className="grid gap-2">
          <Label>Answers</Label>
          {answers.map((answer, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Input
                type="text"
                value={answer.text}
                onChange={(e) => handleAnswerChange(index, 'text', e.target.value)}
                placeholder="Enter answer"
                className="border p-2 flex-1"
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
        </div>
      </div>
    </form>
  );
};

export default QuestionForm;