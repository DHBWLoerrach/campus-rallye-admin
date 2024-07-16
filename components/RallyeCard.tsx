import { format } from 'date-fns';
import { Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function RallyeCard({ rallye, onEdit }) {
  function getRallyeStatus(rallye) {
    switch (rallye.status) {
      case 'preparation':
        return 'Vorbereitung';
      case 'running':
        return 'Gestartet';
      case 'post_processing':
        return 'Nachbereitung';
      case 'ended':
        return 'Beendet';
      default:
        return 'Unbekannt';
    }
  }

  const formattedEndTime = rallye.end_time
    ? format(new Date(rallye.end_time), "dd.MM.yyyy, HH:mm 'Uhr'")
    : 'N/A';

  return (
    <Card className="w-full max-w-md shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-start gap-2">
            <h2 className="text-xl font-bold">{rallye.name}</h2>
            <Badge
              variant={rallye.is_active_rallye ? 'success' : 'danger'}
              className="text-sm font-medium"
            >
              {rallye.is_active_rallye ? 'Aktiv' : 'Inaktiv'}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Bearbeiten"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground">Status:</div>
          <div className="font-medium">{getRallyeStatus(rallye)}</div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground">Endzeitpunkt:</div>
          <div className="font-medium">{formattedEndTime}</div>
        </div>
      </CardContent>
    </Card>
  );
}
