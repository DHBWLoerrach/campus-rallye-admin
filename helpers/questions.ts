export interface Answer {
    id?: number;
    correct: boolean;
    text: string;
    question_id?: number;
  }
  
  export interface Question {
    id?: number;
    content: string;
    type: string;
    enabled: boolean;
    points?: number;
    hint?: string;
    category?: string;
    bucket_path?: string;
    answers?: Answer[];
  }
  
  export type QuestionFormData = Omit<Question, 'id'>;