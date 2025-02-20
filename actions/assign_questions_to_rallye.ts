'use server'

import { createClient } from '@/lib/supabase/server'

export async function assignQuestionsToRallye(rallyeId: number, questionIds: number[]) {
    const supabase = createClient()
    
    try {
        // Get existing assignments
        const { data: existingAssignments } = await supabase
            .from('join_rallye_questions')
            .select('question_id')
            .eq('rallye_id', rallyeId)

        const existingQuestionIds = existingAssignments?.map(a => a.question_id) || []

        // Determine which questions to add and which to remove
        const questionsToAdd = questionIds.filter(id => !existingQuestionIds.includes(id))
        const questionsToRemove = existingQuestionIds.filter(id => !questionIds.includes(id))

        // Remove unselected questions
        if (questionsToRemove.length > 0) {
            const { error: deleteError } = await supabase
                .from('join_rallye_questions')
                .delete()
                .eq('rallye_id', rallyeId)
                .in('question_id', questionsToRemove)

            if (deleteError) throw deleteError
        }

        // Add newly selected questions
        if (questionsToAdd.length > 0) {
            const newAssignments = questionsToAdd.map(questionId => ({
                rallye_id: rallyeId,
                question_id: questionId
            }))

            const { error: insertError } = await supabase
                .from('join_rallye_questions')
                .insert(newAssignments)

            if (insertError) throw insertError
        }
        console.log(questionsToRemove, questionsToAdd)
        return true
    } catch (error) {
        console.error('Error in assignQuestionsToRallye:', error)
        throw error
    }
}

export async function getRallyeQuestions(rallyeId: number) {
    const supabase = createClient()
    
    const { data, error } = await supabase
        .from('join_rallye_questions')
        .select('question_id')
        .eq('rallye_id', rallyeId)

    if (error) {
        console.error('Error fetching rallye questions:', error)
        return []
    }

    return data.map(row => row.question_id)
}