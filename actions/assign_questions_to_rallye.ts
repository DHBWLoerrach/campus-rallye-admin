'use server'

import { createClient } from '@/lib/supabase/server'

export async function assignQuestionsToRallye(rallyeId: number, questionIds: number[]) {
    const supabase = createClient()
    
    try {
        // First remove existing assignments for this rallye
        const { error: deleteError } = await supabase
            .from('join_rallye_questions')
            .delete()
            .eq('rallye_id', rallyeId)

        if (deleteError) {
            console.error('Error deleting existing assignments:', deleteError)
            return false
        }

        // Create new assignments
        const assignments = questionIds.map(questionId => ({
            rallye_id: rallyeId,
            question_id: questionId
        }))

        const { error: insertError } = await supabase
            .from('join_rallye_questions')
            .insert(assignments)

        if (insertError) {
            console.error('Error inserting new assignments:', insertError)
            return false
        }

        return true
    } catch (error) {
        console.error('Error assigning questions to rallye:', error)
        return false
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