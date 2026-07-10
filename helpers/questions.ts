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
