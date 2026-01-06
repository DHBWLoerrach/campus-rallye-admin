import { Camera, ChevronRight, Pencil, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FormattedEndTime from '@/components/FormattedEndTime';
import { Rallye, getRallyeStatusLabel, isRallyeActive } from '@/lib/types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getRallyeQuestions } from '@/actions/assign_questions_to_rallye';

interface RallyeCardProps {
  rallye: Rallye;
  onEdit: () => void;
  questionCount?: number;
  uploadQuestionCount?: number;
}

export default function RallyeCard({
  rallye,
  onEdit,
  questionCount: questionCountProp,
  uploadQuestionCount: uploadQuestionCountProp,
}: RallyeCardProps) {
  const statusLabel = getRallyeStatusLabel(rallye.status);
  const isActive = isRallyeActive(rallye.status);
  const router = useRouter();
  const [fetchedQuestionCount, setFetchedQuestionCount] = useState<
    number | undefined
  >(undefined);
  const questionCount =
    questionCountProp !== undefined ? questionCountProp : fetchedQuestionCount;
  const uploadQuestionCount = uploadQuestionCountProp ?? 0;

  // Fallback: only fetch on client if no count was provided from server
  useEffect(() => {
    if (questionCountProp !== undefined) return;
    let isMounted = true;
    (async () => {
      try {
        const result = await getRallyeQuestions(rallye.id);
        if (!result.success) {
          console.error(
            'Failed to load question count for rallye',
            rallye.id,
            result.error
          );
          if (isMounted) setFetchedQuestionCount(0);
          return;
        }
        const ids = result.data ?? [];
        if (isMounted) setFetchedQuestionCount(ids.length);
      } catch (e) {
        if (isMounted) setFetchedQuestionCount(0);
        console.error('Failed to load question count for rallye', rallye.id, e);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [questionCountProp, rallye.id]);

  return (
    <Card
      className="group relative w-full cursor-pointer overflow-hidden border-border/60 bg-card/90 transition-all hover:-translate-y-0.5 hover:shadow-[0_2px_0_rgba(0,0,0,0.04),0_12px_28px_rgba(0,0,0,0.12)]"
      onClick={() => router.push(`/rallyes/${rallye.id}/questions`)}
      role="button"
      aria-label={`Rallye ${rallye.name} öffnen`}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-primary/80" aria-hidden="true" />
      <CardHeader className="space-y-3 pb-4">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-lg font-semibold leading-tight">
            {rallye.name}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Bearbeiten"
            className="text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <Badge variant={isActive ? 'default' : 'secondary'}>
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Ende
            </span>
            <span className="font-medium text-foreground">
              <FormattedEndTime value={rallye.end_time} />
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Studiengang
            </span>
            <span className="font-medium text-foreground">
              {rallye.studiengang}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">
            {questionCount === undefined
              ? 'Fragen: …'
              : questionCount === 0
              ? 'Keine Fragen'
              : `${questionCount} ${questionCount === 1 ? 'Frage' : 'Fragen'}`}
          </div>
          <div className="flex flex-col items-end gap-1">
            <Link
              href={`/rallyes/${rallye.id}/questions`}
              className="group flex items-center gap-1 font-semibold text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
              aria-label="Fragen zuordnen"
            >
              Fragen zuordnen
              <ChevronRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
            {uploadQuestionCount > 0 && (
              <Link
                href={`/rallyes/${rallye.id}/uploads`}
                className="group flex items-center gap-1 text-xs font-semibold text-primary/80 hover:text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
                aria-label="Upload-Fotos anzeigen"
              >
                Upload-Fotos
                <Camera
                  className="h-3.5 w-3.5 transition-transform group-hover:-rotate-6"
                  aria-hidden="true"
                />
              </Link>
            )}
            {rallye.status === 'ended' && (
              <Link
                href={`/rallyes/${rallye.id}/results`}
                className="group flex items-center gap-1 text-xs font-semibold text-primary/80 hover:text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
                aria-label="Endstand anzeigen"
              >
                Endstand
                <Trophy
                  className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
