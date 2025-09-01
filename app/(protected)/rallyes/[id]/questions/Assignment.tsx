"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Question } from '@/helpers/questions';
import { getQuestions } from '@/actions/question';
import { questionTypes } from '@/helpers/questionTypes';
import {
  assignQuestionsToRallye,
  getRallyeQuestions,
} from '@/actions/assign_questions_to_rallye';
import SearchFilters from '@/components/questions/SearchFilters';
import { useRouter } from 'next/navigation';
import { updateVotingBatch, getVotingQuestions } from '@/actions/voting';

interface Props {
  rallyeId: number;
  rallyeName?: string;
}

export default function Assignment({ rallyeId, rallyeName }: Props) {
  const router = useRouter();
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [votingQuestions, setVotingQuestions] = useState<number[]>([]);
  const [pendingVotingChanges, setPendingVotingChanges] = useState<{
    add: number[];
    remove: number[];
  }>({ add: [], remove: [] });

  const questionTypeLabels = questionTypes.reduce((acc, type) => {
    acc[type.id] = type.name;
    return acc;
  }, {} as Record<string, string>);

  useEffect(() => {
    loadExistingAssignments(rallyeId);
    fetchQuestions();
  }, [rallyeId]);

  const loadExistingAssignments = async (rallyeId: number) => {
    try {
      const [existingQuestions, existingVotes] = await Promise.all([
        getRallyeQuestions(rallyeId),
        getVotingQuestions(rallyeId),
      ]);
      setSelectedQuestions(existingQuestions);
      setVotingQuestions(existingVotes);
    } catch (error) {
      console.error('Error loading existing assignments:', error);
      // todo return error message
    }
  };

  const fetchQuestions = async () => {
    const questions = await getQuestions({});
    setQuestions(questions);
  };

  const handleFilterChange = async (filters: {
    question?: string;
    answer?: string;
    type?: string;
    category?: string;
    enabled?: boolean;
  }) => {
    const filteredQuestions = await getQuestions(filters);
    setQuestions(filteredQuestions);
  };

  const handleSubmit = async () => {
    if (selectedQuestions.length === 0) {
      // TODO: Show error message
      return;
    }
    setIsSubmitting(true);
    try {
      await Promise.all([
        assignQuestionsToRallye(rallyeId, selectedQuestions),
        updateVotingBatch(
          rallyeId,
          pendingVotingChanges.add,
          pendingVotingChanges.remove
        ),
      ]);
      // Reset pending changes
      setPendingVotingChanges({ add: [], remove: [] });
      // Show success message
    } catch (error) {
      // Show error message
      console.error('Error saving questions:', error);
    } finally {
      setIsSubmitting(false);
      router.push('/rallyes');
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {rallyeName
              ? `Fragen der Rallye "${rallyeName}" zuordnen`
              : 'Fragen einer Rallye zuordnen'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <SearchFilters onFilterChange={handleFilterChange} />
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Auswahl</TableHead>
                    <TableHead>Frage</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead className="w-20">Punkte</TableHead>
                    <TableHead>Kategorie</TableHead>
                    <TableHead className="w-8">Abstimmung</TableHead>
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
                                setSelectedQuestions([
                                  ...selectedQuestions,
                                  question.id,
                                ]);
                              } else {
                                setSelectedQuestions(
                                  selectedQuestions.filter(
                                    (id) => id !== question.id
                                  )
                                );
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="max-w-md truncate">
                          {question.content}
                        </TableCell>
                        <TableCell>
                          {questionTypeLabels[question.type]}
                        </TableCell>
                        <TableCell>{question.points}</TableCell>
                        <TableCell>{question.category}</TableCell>
                        <TableCell>
                          <div className="justify-center flex">
                            <Checkbox
                              disabled={
                                !['upload', 'knowledge'].includes(
                                  question.type
                                )
                              }
                              checked={votingQuestions.includes(question.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setVotingQuestions([
                                    ...votingQuestions,
                                    question.id,
                                  ]);
                                  setPendingVotingChanges((prev) => ({
                                    add: [...prev.add, question.id],
                                    remove: prev.remove.filter(
                                      (id) => id !== question.id
                                    ),
                                  }));
                                } else {
                                  setVotingQuestions(
                                    votingQuestions.filter(
                                      (id) => id !== question.id
                                    )
                                  );
                                  setPendingVotingChanges((prev) => ({
                                    add: prev.add.filter(
                                      (id) => id !== question.id
                                    ),
                                    remove: [...prev.remove, question.id],
                                  }));
                                }
                              }}
                              className={
                                !['upload', 'knowledge'].includes(
                                  question.type
                                )
                                  ? 'data-[state=checked]:bg-gray-200 data-[state=unchecked]:bg-gray-100 border-dashed border-gray-400'
                                  : ''
                              }
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Button
              variant="outline"
              onClick={() => {
                // reload assignments for current rallye
                loadExistingAssignments(rallyeId);
                setPendingVotingChanges({ add: [], remove: [] });
              }}
            >
              Zurücksetzen
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={selectedQuestions.length === 0 || isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Speichern
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

