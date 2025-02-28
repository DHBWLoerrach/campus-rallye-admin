'use server';

import { createClient } from '@/lib/supabase/server';

export async function getCategories() {
    const supabase = createClient();
    let { data: categories, error: categoriesError } = await supabase
        .from('questions')
        .select("category")
        .not('category', 'is', null);

    if (categoriesError) {
        throw new Error(`Error fetching categories: ${categoriesError.message}`);
    }

    if (!categories || categories.length === 0) {
        console.log('No questions found');
        return [];
    }


    return [...new Set(categories.map(item => item.category))];
}

export async function getQuestionById(id: number) {
    const supabase = createClient();
    let { data: questions, error: questionError } = await supabase
        .from('questions')
        .select()
        .eq('id', id);

    if (questionError) {
        console.error('Error fetching questions:', questionError);
        return [];
    }

    if (!questions || questions.length === 0) {
        console.log('No questions found');
        return [];
    }

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

    return questions[0];
}

export async function getQuestions(
    filters: {
        question?: string,
        answer?: string,
        type?: string,
        category?: string,
        enabled?: boolean
    }) {
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
    }

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

    if (filters.question) {
        questions = questions.filter(question => question.content.toLowerCase().includes(filters.question.toLowerCase()));
    }

    if (filters.answer) {
        questions = questions.filter(question => question.answers.some(answer => answer.text.toLowerCase().includes(filters.answer.toLowerCase())));
    }

    if (filters.type) {
        questions = questions.filter(question => question.type === filters.type);
    }

    if (filters.category) {
        questions = questions.filter(question => question.category === filters.category);
    }

    if (filters.enabled !== undefined) {
        questions = questions.filter(question => question.enabled === filters.enabled);
    }

    const bucketName = "question-media";
    const fileName = "test.jpg";

    const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

    console.log("publicURL: ", data); // Die URL des Bildes

    return questions;
}


export async function createQuestion(
    data: {
        content: string,
        type: string,
        enabled: boolean,
        points?: number,
        hint?: string,
        category?: string,
        bucket_path?: string,
        answers: { correct: boolean, text?: string }[]
    }
) {
    try {
        const supabase = createClient();
        // Insert the question
        const { data: questionData, error: questionError } = await supabase
            .from('questions')
            .insert([{ content: data.content, type: data.type, enabled: data.enabled, points: data.points, hint: data.hint, category: data.category, bucket_path: data.bucket_path }], { returning: 'minimal' })
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

export async function updateQuestion(
    id: number,
    data: {
        content: string,
        type: string,
        enabled: boolean,
        points?: number,
        hint?: string,
        category?: string,
        bucket_path?: string,
        answers: { id?: number, correct: boolean, text?: string }[]
    }
) {
    console.log(data)
    try {
        const supabase = createClient();
        // Update the question
        const { error: questionError } = await supabase
            .from('questions')
            // category muss mit null gespeichert werden, um sicherzustellen, 
            // dass die Kategorie gelöscht wird, wenn sie leer ist
            .update({ content: data.content, type: data.type, enabled: data.enabled, points: data.points, hint: data.hint, category: data.category || null, bucket_path: data.bucket_path || null })
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