import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronDown, CircleHelp, Copy, Pencil } from 'lucide-react';
import Link from 'next/link';
import { Button, buttonVariants } from '../ui/button';
import { questionTypes } from '../../helpers/questionTypes';
import { buildQuestionCopyHref } from '@/lib/question-copy-context';
import { Question } from '@/helpers/questions';
import QuestionSummary from '@/components/questions/QuestionSummary';
import QuestionDetailsRows from '@/components/questions/QuestionDetailsRows';
import { questionTypeIcons } from '@/components/questions/question-type-icons';

interface QuestionsTableProps {
  questions: Question[];
  rallyeMap?: Record<number, string[]>;
}

const questionTypesById = new Map(
  questionTypes.map((questionType) => [questionType.id, questionType])
);

const QuestionsTable: React.FC<QuestionsTableProps> = ({
  questions,
  rallyeMap,
}) => {
  const [expandedRows, setExpandedRows] = useState<number[]>([]);

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
              <TableHead>Aufgabe</TableHead>
              <TableHead className="min-w-48">Was Teilnehmende tun</TableHead>
              <TableHead className="w-28">Punkte</TableHead>
              <TableHead className="min-w-40">Verwendet in</TableHead>
              <TableHead className="min-w-72 text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Keine Einträge
                </TableCell>
              </TableRow>
            ) : (
              questions.map((question) => {
                const rallyeNames = rallyeMap?.[question.id] ?? [];
                const isExpanded = expandedRows.includes(question.id);
                const questionType = questionTypesById.get(question.type);
                const QuestionTypeIcon =
                  (questionType && questionTypeIcons[questionType.icon]) ??
                  CircleHelp;
                const detailsId = `question-${question.id}-details`;

                return (
                  <React.Fragment key={question.id}>
                    <TableRow>
                      <TableCell className="align-top">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground"
                          onClick={() => toggleRow(question.id)}
                          aria-expanded={isExpanded}
                          aria-controls={isExpanded ? detailsId : undefined}
                          aria-label={`Details zu „${question.content}“ ${isExpanded ? 'ausblenden' : 'anzeigen'}`}
                        >
                          <ChevronDown
                            aria-hidden="true"
                            className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </Button>
                      </TableCell>
                      <TableCell className="max-w-lg align-top">
                        <QuestionSummary question={question} />
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex items-center gap-2">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
                            <QuestionTypeIcon
                              className="size-4"
                              aria-hidden="true"
                            />
                          </span>
                          <span
                            className={
                              questionType
                                ? 'font-medium text-foreground'
                                : 'text-destructive'
                            }
                          >
                            {questionType?.action ?? 'Aufgabenart fehlt'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="align-top text-muted-foreground">
                        {question.point_value === undefined ||
                        question.point_value === null
                          ? 'Keine Punkte'
                          : `${question.point_value} ${question.point_value === 1 ? 'Punkt' : 'Punkte'}`}
                      </TableCell>
                      <TableCell className="align-top">
                        {rallyeNames.length === 0 ? (
                          <span className="text-muted-foreground">
                            Noch nicht verwendet
                          </span>
                        ) : (
                          <span
                            className="text-muted-foreground"
                            title={rallyeNames.join(', ')}
                          >
                            {rallyeNames.length}{' '}
                            {rallyeNames.length === 1 ? 'Rallye' : 'Rallyes'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={buildQuestionCopyHref(question.id)}
                            aria-label={`„${question.content}“ als neue Aufgabe verwenden`}
                            className={buttonVariants({
                              variant: 'outline',
                              size: 'sm',
                            })}
                          >
                            <Copy aria-hidden="true" />
                            Als neue Aufgabe
                          </Link>
                          <Link
                            href={`/questions/${question.id}`}
                            aria-label={`Aufgabe „${question.content}“ bearbeiten`}
                            className={buttonVariants({
                              variant: 'ghost',
                              size: 'sm',
                            })}
                          >
                            <Pencil aria-hidden="true" />
                            Bearbeiten
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow
                        id={detailsId}
                        className="bg-muted/30 hover:bg-muted/30"
                      >
                        <TableCell colSpan={6} className="p-0">
                          <div className="p-3 pl-12 border-b">
                            <QuestionDetailsRows
                              question={question}
                              rallyeNames={rallyeNames}
                              isExpanded={true}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
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
