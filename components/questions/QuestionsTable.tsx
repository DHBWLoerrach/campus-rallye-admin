import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Check, ChevronDown, Pencil, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../ui/button';
import { questionTypes } from '../../helpers/questionTypes';
import { Question } from '@/helpers/questions';

interface QuestionsTableProps {
  questions: Question[];
}

const QuestionsTable: React.FC<QuestionsTableProps> = ({ questions }) => {
  const [expandedRows, setExpandedRows] = useState<number[]>([]);

  const questionTypeLabels = questionTypes.reduce<Record<string, string>>(
    (acc, type) => {
      acc[type.id] = type.name;
      return acc;
    },
    {}
  );

  const toggleRow = (questionId: number) => {
    setExpandedRows((current) =>
      current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId]
    );
  };
  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/90">
        <Table className="text-sm [&_th]:h-9 [&_th]:px-3 [&_td]:px-3 [&_td]:py-2">
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Frage</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead>Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Keine Einträge
                </TableCell>
              </TableRow>
            ) : (
              questions.map((question) => {
                return (
                  <React.Fragment key={question.id}>
                    <TableRow>
                      <TableCell>
                        <ChevronDown
                          className={`h-4 w-4 cursor-pointer text-muted-foreground transition-transform hover:text-foreground ${
                            expandedRows.includes(question.id)
                              ? 'rotate-180'
                              : ''
                          }`}
                          onClick={() => toggleRow(question.id)}
                        />
                      </TableCell>
                      <TableCell className="max-w-md truncate">
                        {question.content}
                      </TableCell>
                      <TableCell>{questionTypeLabels[question.type]}</TableCell>
                    <TableCell>
                      <Button asChild variant="dhbwStyle" size="sm">
                        <Link href={`/questions/${question.id}`}>
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">Bearbeiten</span>
                        </Link>
                      </Button>
                    </TableCell>
                    </TableRow>
                    {expandedRows.includes(question.id) &&
                      question.answers?.map((answer) => (
                        <TableRow
                          key={answer.id}
                          className="bg-muted/40 text-muted-foreground"
                        >
                          <TableCell />
                          <TableCell colSpan={3}>
                            <div className="pl-6 flex items-center gap-2">
                              {answer.correct ? (
                                <Check className="h-4 w-4 text-success" />
                              ) : (
                                <X className="h-4 w-4 text-destructive" />
                              )}
                              {answer.text}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default QuestionsTable;
