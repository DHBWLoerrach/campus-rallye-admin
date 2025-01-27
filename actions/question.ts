'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export async function getQuestions() {
    const supabase = createClient();
    let { data: questions, error: questionError } = await supabase
        .from('questions')
        .select();

    if (questionError) {
        console.error('Error fetching questions:', questionError);
        return [];
    }

    if (!questions || questions.length === 0) {
        console.log('No questions found');
        return [];
    } else {
        console.log('Questions fetched:', questions);
    }

    // Fetch answers for each question
    for (let question of questions) {
        let { data: answers, error: answerError } = await supabase
            .from('answers')
            .select()
            .eq('question_id', question.id);

        if (answerError) {
            console.error(`Error fetching answers for question ${question.id}:`, answerError);
            question.answers = [];
        } else {
            question.answers = answers;
        }
    }

    return questions;
}


export async function createQuestion(data: { content: string, type: string, enabled: boolean, points?: number, hint?: string, answers: { correct: boolean, text?: string }[] }) {
    try {
        const supabase = createClient();
        // Insert the question
        const { data: questionData, error: questionError } = await supabase
            .from('questions')
            .insert([{ content: data.content, type: data.type, enabled: data.enabled, points: data.points, hint: data.hint }])
            .select();

        if (questionError) {
            console.error('Error adding question:', questionError);
            return false;
        }

        const questionId = questionData[0].id;

        // Insert the answers
        const answersData = data.answers.map(answer => ({ ...answer, question_id: questionId }));
        const { error: answersError } = await supabase
            .from('answers')
            .insert(answersData);

        if (answersError) {
            console.error('Error adding answers:', answersError);
            return false;
        }

        console.log('Question and answers added successfully');
        return true;
    } catch (err) {
        console.error('Error processing request:', err.message);
        return false;
    }
}

export async function updateQuestion(id: number, data: { content: string, type: string, enabled: boolean, points?: number, hint?: string, answers: { id?: number, correct: boolean, text?: string }[] }) {
    try {
        const supabase = createClient();
        // Update the question
        const { error: questionError } = await supabase
            .from('questions')
            .update({ content: data.content, type: data.type, enabled: data.enabled, points: data.points, hint: data.hint })
            .eq('id', id);

        if (questionError) {
            console.error('Error updating question:', questionError);
            return false;
        }

        // Fetch existing answers
        const { data: existingAnswers, error: fetchError } = await supabase
            .from('answers')
            .select('id')
            .eq('question_id', id);

        if (fetchError) {
            console.error('Error fetching existing answers:', fetchError);
            return false;
        }

        const existingAnswerIds = existingAnswers.map(answer => answer.id);
        const newAnswerIds = data.answers.map(answer => answer.id).filter(id => id !== undefined);

        // Delete answers that are not in the new list
        const answersToDelete = existingAnswerIds.filter(id => !newAnswerIds.includes(id));
        if (answersToDelete.length > 0) {
            const { error: deleteError } = await supabase
                .from('answers')
                .delete()
                .in('id', answersToDelete);

            if (deleteError) {
                console.error('Error deleting answers:', deleteError);
                return false;
            }
        }

        // Update or insert answers
        for (let answer of data.answers) {
            if (answer.id) {
                // Update existing answer
                const { error: answerError } = await supabase
                    .from('answers')
                    .update({ correct: answer.correct, text: answer.text })
                    .eq('id', answer.id)
                    .eq('question_id', id);

                if (answerError) {
                    console.error(`Error updating answer ${answer.id}:`, answerError);
                    return false;
                }
            } else {
                // Insert new answer
                const { error: answerError } = await supabase
                    .from('answers')
                    .insert({ correct: answer.correct, text: answer.text, question_id: id });

                if (answerError) {
                    console.error('Error adding new answer:', answerError);
                    return false;
                }
            }
        }

        console.log('Question and answers updated successfully');
        return true;
    } catch (err) {
        console.error('Error processing request:', err.message);
        return false;
    }
}

export async function deleteQuestion(id: number) {
    try {
        const supabase = createClient();
        // Lösche die Antworten, die mit der Frage verknüpft sind
        const { error: answersError } = await supabase
            .from('answers')
            .delete()
            .eq('question_id', id);

        if (answersError) {
            console.error('Error deleting answers:', answersError);
            return false;
        }

        // Lösche die Frage
        const { error: questionError } = await supabase
            .from('questions')
            .delete()
            .eq('id', id);

        if (questionError) {
            console.error('Error deleting question:', questionError);
            return false;
        }

        console.log('Question and answers deleted successfully');
        return true;
    } catch (err) {
        console.error('Error processing request:', err.message);
        return false;
    }
}