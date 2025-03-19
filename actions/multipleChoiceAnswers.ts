'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type FormState = { errors?: { message?: string } } | undefined;

export async function createMultipleChoiceAnswers(
  state: FormState,
  formData: FormData
) {
  const supabase = createClient();

  const data = { name: formData.get('name') as string };

  const { error } = await supabase.from('rallye').insert({
    name: data.name,
    is_active_rallye: false,
    status: 'preparation',
  });

  if (error) {
    return { errors: { message: 'Es ist ein Fehler aufgetreten' } };
  }

  revalidatePath('/');
  return { success: { message: 'Rallye erfolgreich gespeichert' } };
}

export async function updateMultipleChoiceAnswers(
  state: FormState,
  formData: FormData
) {
  const supabase = createClient();

  const data = {
    id: formData.get('id') as string,
    name: formData.get('name') as string,
    is_active_rallye: formData.get('active') === 'on', // checkbox value needs to be converted to boolean (might be 'on' or null)
    status: formData.get('status') as string,
    end_time: new Date(formData.get('end_time') as string),
  };

  const { error } = await supabase
    .from('rallye')
    .update({
      name: data.name,
      is_active_rallye: data.is_active_rallye,
      status: data.status,
      end_time: data.end_time,
    })
    .eq('id', data.id);

  if (error) {
    return { errors: { message: 'Es ist ein Fehler aufgetreten' } };
  }

  revalidatePath('/');
  return { success: { message: 'Rallye erfolgreich gespeichert' } };
}

export async function getChildren(id) {
  // console.log(id);
  const supabase = createClient();
  // console.log("test");
  const { data: questions } = await supabase
    .from('question')
    .select('*')
    .eq('parent_id', id);
  // console.log(questions);
  return questions;
}

export async function saveQuestions(questions, parent) {
  const supabase = createClient();
  let current_questions = await getChildren(parent.id);
  if (!current_questions) current_questions = [];
  for (const item of current_questions) {
    if (
      !questions.some(
        (question) =>
          typeof question === 'object' &&
          question !== null &&
          question.id === item.id
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
    if (typeof item === 'object' && item !== null) {
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
      console.log(item, typeof item);
      console.log(parent.question_type, typeof parent.question_type);
      console.log(parent.enabled, typeof parent.enabled);
      console.log(parent.points, typeof parent.points);
      console.log(parent.id, typeof parent.id);
      console.log(parent.category, typeof parent.category);
      console.log(new Date().toISOString(), typeof new Date().toISOString());
      console.log(parent.uri, typeof parent.uri);
      console.log(parent.video, typeof parent.video);
      console.log(parent.hint, typeof parent.hint);

      console.log('create from string', item);
      const { error } = await supabase.from('question').insert({
        // created_at: new Date().toISOString(),
        question_type: parent.question_type,
        // enabled: parent.enabled,
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
