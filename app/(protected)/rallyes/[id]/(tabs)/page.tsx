import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import createClient from '@/lib/supabase';
import { questionTypes } from '@/helpers/questionTypes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface PageProps {
  params: Promise<{ id: string }>;
}

type AssignedQuestionRow = {
  is_voting: boolean | null;
  questions: {
    id: number;
    content: string | null;
    type: string | null;
    points: number | null;
  } | null;
};

const getTypeLabel = (type: string | null): string =>
  questionTypes.find((t) => t.id === type)?.name ?? '—';

export default async function RallyeQuestionsTab(props: PageProps) {
  const params = await props.params;
  const idStr = params.id;
  if (!/^\d+$/.test(idStr)) {
    notFound();
  }
  const rallyeId = Number(idStr);

  const supabase = await createClient();
  const { data: rallye } = await supabase
    .from('rallye')
    .select('id')
    .eq('id', rallyeId)
    .maybeSingle();
  if (!rallye) {
    notFound();
  }

  const { data } = await supabase
    .from('join_rallye_questions')
    .select('is_voting, questions(id, content, type, points)')
    .eq('rallye_id', rallyeId);
  const rows = (data ?? []) as unknown as AssignedQuestionRow[];
  const assigned = rows
    .filter((row) => row.questions !== null)
    .sort((a, b) =>
      (a.questions?.content ?? '').localeCompare(
        b.questions?.content ?? '',
        'de',
        { sensitivity: 'base' }
      )
    );
  const totalPoints = assigned.reduce(
    (sum, row) => sum + (row.questions?.points ?? 0),
    0
  );

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {assigned.length === 0
            ? 'Keine Fragen zugeordnet'
            : `${assigned.length} ${assigned.length === 1 ? 'Frage' : 'Fragen'} · ${totalPoints} Punkte gesamt`}
        </p>
        <Button asChild variant="dhbwStyle" size="sm">
          <Link href={`/rallyes/${rallyeId}/questions`}>
            Fragen zuordnen
            <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      {assigned.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Frage</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead className="text-right">Punkte</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assigned.map((row) => (
              <TableRow key={row.questions!.id}>
                <TableCell className="max-w-xl">
                  <span className="line-clamp-2">{row.questions!.content}</span>
                  {row.is_voting && (
                    <Badge variant="outline" className="ml-2">
                      Abstimmung
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {getTypeLabel(row.questions!.type)}
                </TableCell>
                <TableCell className="text-right">
                  {row.questions!.points ?? '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
