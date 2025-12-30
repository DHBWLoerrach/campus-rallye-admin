import React, { useState } from 'react';
import Image from 'next/image';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Check, ChevronDown, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../ui/button';
import { questionTypes } from '../../helpers/questionTypes';
import { Question } from '@/helpers/questions';
import { getQuestionMediaPublicUrl } from '@/lib/supabase-public';

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
        <Table className="text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Frage</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead className="w-20">Punkte</TableHead>
              <TableHead>Bild</TableHead>
              <TableHead>Kategorie</TableHead>
              <TableHead>Hinweis</TableHead>
              <TableHead>Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  Keine Einträge
                </TableCell>
              </TableRow>
            ) : (
              questions.map((question) => (
                <React.Fragment key={question.id}>
                  <TableRow>
                  <TableCell>
                    <ChevronDown
                      className={`h-4 w-4 cursor-pointer text-muted-foreground transition-transform hover:text-foreground ${
                        expandedRows.includes(question.id) ? 'rotate-180' : ''
                      }`}
                      onClick={() => toggleRow(question.id)}
                    />
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    {question.content}
                  </TableCell>
                    <TableCell>{questionTypeLabels[question.type]}</TableCell>
                    <TableCell>{question.points}</TableCell>
                    <TableCell>
                      {question.bucket_path ? (
                        <Image
                          src={getQuestionMediaPublicUrl(question.bucket_path)}
                          alt="Frage Bild"
                          width={50}
                          height={50}
                          sizes="50px"
                          className="object-cover rounded"
                        />
                      ) : (
                        <span className="flex justify-center text-muted-foreground">
                          -
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{question.category}</TableCell>
                    <TableCell>{question.hint}</TableCell>
                    <TableCell>
                      <Button asChild variant="dhbwStyle" size="sm">
                        <Link href={`/questions/${question.id}`}>
                          Bearbeiten
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
                        <TableCell colSpan={6}>
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default QuestionsTable;
