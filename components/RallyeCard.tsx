import { ChevronRight, Pencil } from 'lucide-react';
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
}

export default function RallyeCard({ rallye, onEdit }: RallyeCardProps) {
  const statusLabel = getRallyeStatusLabel(rallye.status);
  const isActive = isRallyeActive(rallye.status);
  const router = useRouter();
  const [questionCount, setQuestionCount] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const ids = await getRallyeQuestions(rallye.id);
        if (isMounted) setQuestionCount(ids.length);
      } catch (e) {
        if (isMounted) setQuestionCount(0);
        console.error('Failed to load question count for rallye', rallye.id, e);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [rallye.id]);

  return (
    <Card
      className="w-full max-w-md shadow-md cursor-pointer"
      onClick={() => router.push(`/rallyes/${rallye.id}/questions`)}
      role="button"
      aria-label={`Rallye ${rallye.name} öffnen`}
    >
      <CardHeader>
        <CardTitle className="text-xl">{rallye.name}</CardTitle>
        <div className="flex items-center justify-between">
          <Badge
            variant={isActive ? 'default' : 'secondary'}
            className="text-sm font-medium"
          >
            {statusLabel}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Bearbeiten"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground">Ende:</div>
          <div className="font-medium">
            <FormattedEndTime value={rallye.end_time} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground">Studiengang:</div>
          <div className="font-medium">{rallye.studiengang}</div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-muted-foreground">
            {questionCount === null
              ? 'Fragen: …'
              : questionCount === 0
              ? 'Keine Fragen'
              : `${questionCount} ${questionCount === 1 ? 'Frage' : 'Fragen'}`}
          </div>
          <Link
            href={`/rallyes/${rallye.id}/questions`}
            className="text-sm font-medium flex items-center gap-1 hover:underline"
            onClick={(e) => e.stopPropagation()}
            aria-label="Fragen zuordnen"
          >
            Fragen zuordnen…
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
