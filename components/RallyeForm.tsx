'use client';

import { useState } from 'react';
// TODO: in React 19, this will be just `useFormAction`
// https://react.dev/reference/react/useActionState
// https://react.dev/blog/2024/04/25/react-19#new-hook-useactionstate
import { useFormState, useFormStatus } from 'react-dom';
import { de } from 'date-fns/locale';
import { CircleX } from 'lucide-react';
import { updateRallye } from '@/actions/rallye';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 mt-4"
      aria-disabled={pending}
      disabled={pending}
    >
      {pending ? 'Wird gesendet…' : 'Speichern'}
    </button>
  );
}

export default function RallyeCardForm({ rallye, onCancel }) {
  const [formState, formAction] = useFormState(updateRallye, {
    errors: { message: '' },
  });
  const [name, setName] = useState<string>(rallye.name);
  const [active, setActive] = useState<boolean>(rallye.is_active);
  const [status, setStatus] = useState<string>(rallye.status);
  const [date24, setDate24] = useState<Date | undefined>(
    new Date(rallye.end_time)
  );
  const [studiengang, setStudiengang] = useState<string>(rallye.studiengang);

  return (
    <Card className="w-full max-w-md shadow-md">
      <CardHeader>
        <CardTitle className="flex justify-between items-center text-xl ">
          Rallye bearbeiten
          <Button
            variant="ghost"
            size="icon"
            aria-label="Abbrechen"
            onClick={onCancel}
          >
            <CircleX className="h-4 w-4" aria-hidden="true" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <input type="hidden" name="id" value={rallye.id} />
          <input type="hidden" name="end_time" value={date24?.toISOString()} />
          <Input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex items-center space-x-2 mt-2">
            <Label htmlFor={`rallye-${rallye.id}-active`}>Rallye aktiv</Label>
            <Switch
              name="active"
              checked={active}
              onCheckedChange={setActive}
            />
          </div>
          <div className="flex items-center space-x-2 mt-2">
            <Label htmlFor={`rallye-${rallye.id}-status`}>
              Status der Rallye
            </Label>
            <RadioGroup name="status" value={status} onValueChange={setStatus}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="preparing" id="r1" />
                <Label htmlFor="r1">Vorbereitung</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="running" id="r2" />
                <Label htmlFor="r2">Gestartet</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="post_processing" id="r3" />
                <Label htmlFor="r3">Abstimmung</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ended" id="r4" />
                <Label htmlFor="r4">Beendet</Label>
              </div>
            </RadioGroup>
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
          <div className="flex items-center space-x-2 mt-2">
            <Label htmlFor={`rallye-${rallye.id}-studiengang`}>
              Studiengang
            </Label>
            <Input
              name="studiengang"
              value={studiengang}
              onChange={(e) => setStudiengang(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2 mt-2 justify-between">
            <Label htmlFor={`rallye-${rallye.id}-password`}>Passwort</Label>
            ***
          </div>
          <SaveButton />
          {formState?.errors && (
            <span className="text-sm text-red-500 ml-2">
              {formState.errors.message}
            </span>
          )}
          {formState?.success && (
            <span className="text-sm text-green-500 ml-2">
              {formState.success.message}
            </span>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
