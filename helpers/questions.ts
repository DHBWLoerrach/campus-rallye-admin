import type { GeocachingInputType, QuestionTypeId } from './questionTypes';

export interface SolutionOption {
  id?: number;
  correct: boolean;
  text?: string;
  question_id?: number;
}

export interface GeocachingConfig {
  target_latitude: number;
  target_longitude: number;
  proximity_radius: number;
  input_type: GeocachingInputType;
}

export interface GeocachingFormConfig {
  target_latitude?: number;
  target_longitude?: number;
  proximity_radius?: number;
  input_type: GeocachingInputType;
}

export interface Question {
  id: number;
  content: string;
  type: QuestionTypeId;
  point_value?: number;
  hint?: string;
  category?: string;
  bucket_path?: string;
  solutionOptions?: SolutionOption[];
  geocaching?: GeocachingConfig | null;
}

export type QuestionFormData = Omit<Question, 'id' | 'type' | 'geocaching'> & {
  type: QuestionTypeId | '';
  geocaching?: GeocachingFormConfig;
  rallyeIds?: number[];
};

export type CopiedQuestionFormData = Omit<
  QuestionFormData,
  'type' | 'geocaching'
> & {
  type: QuestionTypeId;
  geocaching?: GeocachingConfig;
};

export function copyQuestionForCreation(
  question: Question
): CopiedQuestionFormData {
  return {
    content: question.content,
    type: question.type,
    point_value: question.point_value,
    hint: question.hint,
    category: question.category,
    solutionOptions: question.solutionOptions?.map((answer) => ({
      correct: answer.correct,
      text: answer.text,
    })),
    geocaching: question.geocaching ? { ...question.geocaching } : undefined,
  };
}
