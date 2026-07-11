export interface SolutionOption {
  id?: number;
  correct: boolean;
  text?: string;
  question_id?: number;
}

export interface Question {
  id: number;
  content: string;
  type: string;
  point_value?: number;
  hint?: string;
  category?: string;
  bucket_path?: string;
  solutionOptions?: SolutionOption[];
}

export type QuestionFormData = Omit<Question, 'id'> & {
  rallyeIds?: number[];
};

export const copyQuestionForCreation = (
  question: Question
): QuestionFormData => ({
  content: question.content,
  type: question.type,
  point_value: question.point_value,
  hint: question.hint,
  category: question.category,
  solutionOptions: question.solutionOptions?.map((answer) => ({
    correct: answer.correct,
    text: answer.text,
  })),
});
