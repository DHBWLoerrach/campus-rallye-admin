'use client'

import { useEffect, useState } from 'react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { HelpCircleIcon } from 'lucide-react'
import { Question } from "@/helpers/questions"
import { getQuestions } from '@/actions/question'
import { getRallyes } from '@/actions/rallye'
import { questionTypes } from '@/helpers/questionTypes'
import { assignQuestionsToRallye, getRallyeQuestions } from '@/actions/assign_questions_to_rallye'

export default function RallyeQuestionsPage() {
    const [selectedQuestions, setSelectedQuestions] = useState<number[]>([])
    const [selectedRallye, setSelectedRallye] = useState<string>("")
    const [rallyes, setRallyes] = useState<any[]>([])
    const [questions, setQuestions] = useState<Question[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)

    const questionTypeLabels = questionTypes.reduce((acc, type) => {
        acc[type.id] = type.name;
        return acc;
    }, {});

    useEffect(() => {
        fetchRallyes()
        fetchQuestions()
    }, [])

    useEffect(() => {
        if (selectedRallye) {
            loadExistingAssignments(parseInt(selectedRallye))
        } else {
            setSelectedQuestions([])
        }
    }, [selectedRallye])

    const loadExistingAssignments = async (rallyeId: number) => {
        try {
            const existingQuestions = await getRallyeQuestions(rallyeId)
            setSelectedQuestions(existingQuestions)
        } catch (error) {
            console.error('Error loading existing assignments:', error)
        }
    }

    const fetchRallyes = async () => {
        const rallye = await getRallyes()
        setRallyes(rallye)
    }

    const fetchQuestions = async () => {
        const questions = await getQuestions({})
        setQuestions(questions)
    }

    const handleSubmit = async () => {
        if (!selectedRallye || selectedQuestions.length === 0) {
            // TODO: Show error message
            return
        }
        setIsSubmitting(true)
        try {
            await assignQuestionsToRallye(parseInt(selectedRallye), selectedQuestions)
            // Show success message
        } catch (error) {
            // Show error message
            console.error('Error saving questions:', error)
        } finally {
            setIsSubmitting(false)
        }
    }
    // TODO fitler for questions
    return (
        <div className="container mx-auto p-4 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Fragen einer Rallye zuordnen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="rallye">Rallye auswählen</Label>
                        <Select
                            value={selectedRallye}
                            onValueChange={(value) => setSelectedRallye(value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Wählen Sie eine Rallye" />
                            </SelectTrigger>
                            <SelectContent>
                                {rallyes.map((rallye) => (
                                    <SelectItem key={rallye.id} value={rallye.id.toString()}>
                                        {rallye.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {selectedRallye ? (
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">Auswahl</TableHead>
                                        <TableHead>Frage</TableHead>
                                        <TableHead>Typ</TableHead>
                                        <TableHead className="w-20">Punkte</TableHead>
                                        <TableHead>Kategorie</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {questions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center">
                                                Keine Fragen verfügbar
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        questions.map((question) => (
                                            <TableRow key={question.id}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedQuestions.includes(question.id)}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setSelectedQuestions([...selectedQuestions, question.id])
                                                            } else {
                                                                setSelectedQuestions(selectedQuestions.filter(id => id !== question.id))
                                                            }
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell className="max-w-md truncate">
                                                    {question.content}
                                                </TableCell>
                                                <TableCell>{questionTypeLabels[question.type]}</TableCell>
                                                <TableCell>{question.points}</TableCell>
                                                <TableCell>{question.category}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                    <div className="flex items-center space-x-2">
                        <HelpCircleIcon className="w-6 h-6 text-gray-500" />
                        <span>Wählen Sie eine Rallye aus, um die Fragen anzuzeigen</span>
                    </div>
                    )
                    }


                    <div className="flex justify-end space-x-4">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setSelectedRallye("")
                                setSelectedQuestions([])
                            }}
                        >
                            Zurücksetzen
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!selectedRallye || selectedQuestions.length === 0 || isSubmitting}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Speichern
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}