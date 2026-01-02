import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Check,
  ChevronDown,
  Image as ImageIcon,
  Lightbulb,
  Pencil,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '../ui/button';
import { questionTypes } from '../../helpers/questionTypes';
import { Question } from '@/helpers/questions';

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
                const hasPoints =
                  typeof question.points === 'number' &&
                  Number.isFinite(question.points) &&
                  question.points > 0;
                const hasImage = Boolean(question.bucket_path);
                const hasHint = Boolean(question.hint?.trim());
                const hasRallyes = rallyeNames.length > 0;
                const answers = question.answers ?? [];
                const hasAnswers = answers.length > 0;
                const answersLabel = answers.length === 1 ? 'Antwort' : 'Antworten';
                const answersTitle = answers
                  .map((answer) => {
                    const label = answer.correct ? 'Richtig' : 'Falsch';
                    const text = answer.text?.trim() || '-';
                    return `${label}: ${text}`;
                  })
                  .join(' | ');
                const showMeta = hasPoints || hasImage || hasHint || hasRallyes;
                const rallyeLabel =
                  rallyeNames.length === 1 ? 'Rallye' : 'Rallyes';

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
                      <div className="flex flex-col gap-1">
                        <span className="truncate">{question.content}</span>
                        {showMeta && (
                          <div className="flex flex-wrap items-center gap-2 text-[0.7rem] text-muted-foreground">
                            {hasPoints && (
                              <span
                                className="inline-flex items-center tabular-nums"
                                title={`Punkte: ${question.points}`}
                              >
                                {question.points}p
                              </span>
                            )}
                            {hasImage && (
                              <span
                                className="inline-flex items-center"
                                title="Bild vorhanden"
                              >
                                <ImageIcon
                                  className="h-3 w-3"
                                  aria-hidden="true"
                                />
                                <span className="sr-only">
                                  Bild vorhanden
                                </span>
                              </span>
                            )}
                            {hasHint && (
                              <span
                                className="inline-flex items-center"
                                title="Hinweis vorhanden"
                              >
                                <Lightbulb
                                  className="h-3 w-3"
                                  aria-hidden="true"
                                />
                                <span className="sr-only">
                                  Hinweis vorhanden
                                </span>
                              </span>
                            )}
                            {hasRallyes && (
                              <Badge
                                variant="secondary"
                                className="px-2 py-0.5 text-[0.55rem] font-semibold normal-case tracking-normal"
                                title={`Rallyes: ${rallyeNames.join(', ')}`}
                              >
                                {rallyeNames.length} {rallyeLabel}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
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
                  {expandedRows.includes(question.id) && (
                    <>
                      {hasHint && (
                        <TableRow className="bg-muted/40 text-muted-foreground border-0">
                          <TableCell />
                          <TableCell colSpan={3} className="py-1.5">
                            <div className="pl-5 border-l border-border/40 text-xs">
                              <span className="font-medium text-muted-foreground/80">
                                Hinweis:
                              </span>{' '}
                              {question.hint}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      {hasRallyes && (
                        <TableRow className="bg-muted/40 text-muted-foreground border-0">
                          <TableCell />
                          <TableCell
                            colSpan={3}
                            title={`${rallyeLabel}: ${rallyeNames.join(', ')}`}
                            className="py-1.5"
                          >
                            <div className="pl-5 border-l border-border/40 text-xs">
                              <span className="font-medium text-muted-foreground/80">
                                {rallyeLabel}:
                              </span>{' '}
                              {rallyeNames.join(', ')}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      {hasAnswers && (
                        <TableRow className="bg-muted/40 text-muted-foreground border-0">
                          <TableCell />
                          <TableCell colSpan={3} className="py-1">
                            <div className="pl-5 border-l border-border/40 text-xs flex items-center gap-2">
                              <span className="font-medium text-muted-foreground/80 whitespace-nowrap">
                                {answersLabel}:
                              </span>
                              <div
                                className="min-w-0 flex-1 truncate"
                                title={answersTitle}
                              >
                                {answers.map((answer, index) => (
                                  <span
                                    key={answer.id ?? `${question.id}-${index}`}
                                    className="inline-flex items-center gap-1"
                                  >
                                    {answer.correct ? (
                                      <Check className="h-3 w-3 text-success/70" />
                                    ) : (
                                      <X className="h-3 w-3 text-destructive/70" />
                                    )}
                                    <span>{answer.text?.trim() || '-'}</span>
                                    {index < answers.length - 1 && (
                                      <span className="mx-1 text-muted-foreground/60">
                                        |
                                      </span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
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
