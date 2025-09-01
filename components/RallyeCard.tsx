import { Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FormattedEndTime from '@/components/FormattedEndTime';
import { Rallye, getRallyeStatusLabel, isRallyeActive } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface RallyeCardProps {
  rallye: Rallye;
  onEdit: () => void;
}

export default function RallyeCard({ rallye, onEdit }: RallyeCardProps) {
  const statusLabel = getRallyeStatusLabel(rallye.status);
  const isActive = isRallyeActive(rallye.status);
  const router = useRouter();

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
      </CardContent>
    </Card>
  );
}
