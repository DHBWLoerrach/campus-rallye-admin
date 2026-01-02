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
  Star,
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
                const showMeta =
                  hasPoints || hasImage || hasHint || hasRallyes;
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
                                className="inline-flex items-center gap-1"
                                title={`Punkte: ${question.points}`}
                              >
                                <Star
                                  className="h-3 w-3"
                                  aria-hidden="true"
                                />
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
