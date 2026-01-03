import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronDown, Pencil } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../ui/button';
import { questionTypes } from '../../helpers/questionTypes';
import { Question } from '@/helpers/questions';
import QuestionSummary from '@/components/questions/QuestionSummary';
import QuestionDetailsRows from '@/components/questions/QuestionDetailsRows';

interface QuestionsTableProps {
  questions: Question[];
  rallyeMap?: Record<number, string[]>;
}

const QuestionsTable: React.FC<QuestionsTableProps> = ({
  questions,
  rallyeMap,
}) => {
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
              <TableHead className="w-12 text-center">Aktionen</TableHead>
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
                const rallyeNames = rallyeMap?.[question.id] ?? [];

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
                    <TableCell className="max-w-md">
                      <QuestionSummary
                        question={question}
                        rallyeNames={rallyeNames}
                      />
                    </TableCell>
                    <TableCell>{questionTypeLabels[question.type]}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      >
                        <Link href={`/questions/${question.id}`}>
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">Bearbeiten</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                  <QuestionDetailsRows
                    question={question}
                    rallyeNames={rallyeNames}
                    isExpanded={expandedRows.includes(question.id)}
                    leadingCellsCount={1}
                    colSpan={3}
                  />
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
