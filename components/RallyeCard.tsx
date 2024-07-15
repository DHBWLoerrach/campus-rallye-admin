'use client';

import { useState } from 'react';
import { de } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';

export default function RallyeCard({ rallye }) {
  const [date24, setDate24] = useState<Date>(
    new Date(rallye.end_time)
  );
  return (
    <Card key={rallye.id}>
      <CardHeader>
        <CardTitle>{rallye.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <Label htmlFor={`rallye-${rallye.id}-active`}>
            Rallye aktiv
          </Label>
          <Switch
            id={`rallye-${rallye.id}-active`}
            checked={rallye.is_active_rallye}
            onCheckedChange={console.log}
          />
        </div>
        <div className="flex items-center space-x-2 mt-2">
          <Label htmlFor={`rallye-${rallye.id}-status`}>
            Status der Rallye
          </Label>
          <ToggleGroup
            id={`rallye-${rallye.id}-status`}
            variant="outline"
            type="single"
          >
            <ToggleGroupItem
              value="preparation"
              aria-label="Vorbereitung"
            >
              Vorbereitung
            </ToggleGroupItem>
            <ToggleGroupItem value="running" aria-label="Gestarted">
              Gestartet
            </ToggleGroupItem>
            <ToggleGroupItem
              value="post_processing"
              aria-label="Nachbereitung"
            >
              Nachbereitung
            </ToggleGroupItem>
            <ToggleGroupItem value="endet" aria-label="Beendet">
              Beendet
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex items-center space-x-2 mt-2">
          <Label htmlFor={`rallye-${rallye.id}-endtime`}>
            Ende der Rallye
          </Label>
          <DateTimePicker
            locale={de}
            hourCycle={24}
            value={date24}
            onChange={setDate24}
          />
        </div>
      </CardContent>
    </Card>
  );
}
