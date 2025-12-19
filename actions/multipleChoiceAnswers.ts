'use server';
import createClient from '@/lib/supabase';

type QuestionRow = {
  id: number;
  answer?: string | null;
};

type ParentQuestion = {
  id: number;
  question_type: string | null;
};

type QuestionInput = {
  id: number;
  answer?: string | null;
};

const isQuestionInput = (item: unknown): item is QuestionInput => {
  if (typeof item !== 'object' || item === null) return false;
  return typeof (item as { id?: unknown }).id === 'number';
};

export async function getChildren(id: number): Promise<QuestionRow[] | null> {
  // console.log(id);
  const supabase = await createClient();
  // console.log("test");
  const { data: questions } = await supabase
    .from('question')
    .select('*')
    .eq('parent_id', id);
  // console.log(questions);
  return questions as QuestionRow[] | null;
}

export async function saveQuestions(
  questions: unknown[],
  parent: ParentQuestion
): Promise<void> {
  const supabase = await createClient();
  let current_questions = await getChildren(parent.id);
  if (!current_questions) current_questions = [];
  for (const item of current_questions) {
    if (
      !questions.some(
        (question) => isQuestionInput(question) && question.id === item.id
      )
    ) {
      // delete
      console.log('delete', item.id);
      const { error } = await supabase
        .from('question')
        .delete()
        .eq('id', item.id);
      if (error) {
        console.error('Error deleting question:', error);
      }
    }
  }
  // todo validierung
  // question_type: "multiple_choice"
  // 1. uestion === null && parent_id !== null && answer !== null && points === null && uri === null)
  // 2. question !== null && parent_id === null && answer !== null && points !== null && uri === null

  // Fragen aktualisieren oder erstellen
  for (const item of questions) {
    if (isQuestionInput(item)) {
      if (current_questions.some((question) => question.id === item.id)) {
        // update
        console.log('update', item.id);
        const { error } = await supabase
          .from('question')
          .update({
            answer: item.answer,
          })
          .eq('id', item.id);
        if (error) {
          console.error('Error updating question:', error);
        }
      } else {
        console.log('fehler', item.id);
      }
    } else if (typeof item === 'string') {
      const { error } = await supabase.from('question').insert({
        // created_at: new Date().toISOString(),
        question_type: parent.question_type,
        // category: parent.category,
        question: null,

        answer: item,
        points: null,
        parent_id: parent.id,
        uri: null,
        // video: parent.video,
        // hint: parent.hint,
      });
      if (error) {
        console.error('Error creating question from string:', error);
      }
    } else {
      console.log('unknown item type', item);
    }
  }
}
