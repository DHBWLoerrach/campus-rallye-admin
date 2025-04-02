import { Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FormattedEndTime from '@/components/FormattedEndTime';

export default function RallyeCard({ rallye, onEdit }) {
  function getRallyeStatus(rallye) {
    switch (rallye.status) {
      case 'preparing':
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

  return (
    <Card className="w-full max-w-md shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">{rallye.name}</CardTitle>
        <div className="flex items-center justify-between">
          <Badge
            variant={rallye.is_active ? 'default' : 'secondary'}
            className="text-sm font-medium"
          >
            {rallye.is_active ? 'Aktiv' : 'Inaktiv'}
          </Badge>
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
          <div className="text-muted-foreground">Ende:</div>
          <div className="font-medium">
            <FormattedEndTime value={rallye.end_time} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground">Studiengang:</div>
          <div className="font-medium">{rallye.studiengang}</div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground">Passwort:</div>
          <div className="font-medium">***</div>
        </div>
      </CardContent>
    </Card>
  );
}
