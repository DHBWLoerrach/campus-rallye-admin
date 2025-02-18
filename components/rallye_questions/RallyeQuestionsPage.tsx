'use client'

import { useState } from 'react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

interface Question {
    id: string
    text: string
    isSelected: boolean
}

interface Rallye {
    id: string
    name: string
}

export default function RallyeQuestionsPage() {
    const [selectedRallye, setSelectedRallye] = useState<string>('')
    const [questions, setQuestions] = useState<Question[]>([
        { id: '1', text: 'Question 1', isSelected: false },
        { id: '2', text: 'Question 2', isSelected: false },
    ])

    // Mock-Daten für Rallyes
    const rallyes: Rallye[] = [
        { id: '1', name: 'Campus Tour' },
        { id: '2', name: 'History Walk' },
    ]

    const toggleAllQuestions = (checked: boolean) => {
        setQuestions(questions.map(question => ({
            ...question,
            isSelected: checked
        })))
    }

    const toggleQuestion = (questionId: string) => {
        setQuestions(questions.map(question => 
          question.id === questionId 
            ? { ...question, isSelected: !question.isSelected }
            : question
        ))
      }
      
    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        // Handle form submission - e.g. save selected questions to rallye
        const selectedQuestions = questions.filter(q => q.isSelected)
        console.log('Selected questions:', selectedQuestions)
    }

    return (
        <div className="container mx-auto py-6">
            <Card>
                <CardHeader>
                    <CardTitle>Rallye Questions Manager</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="rallye">Wähle eine Rallye</Label>
                                <Select
                                    value={selectedRallye}
                                    onValueChange={setSelectedRallye}
                                >
                                    <SelectTrigger id="rallye">
                                        <SelectValue placeholder="Wähle eine Rallye aus" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {rallyes.map(rallye => (
                                            <SelectItem key={rallye.id} value={rallye.id}>
                                                {rallye.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {selectedRallye && (
                                <>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between border-b pb-2">
                                            <Label>Verfügbare Fragen</Label>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    onCheckedChange={(checked: boolean) => toggleAllQuestions(checked)}
                                                />
                                                <Label className="text-sm">Alle auswählen</Label>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            {questions.map(question => (
                                                <div
                                                    key={question.id}
                                                    className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                                                >
                                                    <Checkbox
                                                        checked={question.isSelected}
                                                        onCheckedChange={() => toggleQuestion(question.id)}
                                                        id={`question-${question.id}`}
                                                    />
                                                    <Label
                                                        htmlFor={`question-${question.id}`}
                                                        className="flex-grow cursor-pointer"
                                                    >
                                                        {question.text}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex justify-end space-x-2">
                                        <Button type="button" variant="outline">
                                            Abbrechen
                                        </Button>
                                        <Button type="submit">
                                            Speichern
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}