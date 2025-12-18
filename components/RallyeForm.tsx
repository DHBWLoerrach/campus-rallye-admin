'use client';

import { useState, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { de } from 'date-fns/locale';
import { CircleX, Trash2 } from 'lucide-react';
import { updateRallye, deleteRallye } from '@/actions/rallye';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { Rallye, RallyeStatus } from '@/lib/types';
import { getRallyeStatusLabel } from '@/lib/types';

interface RallyeFormProps {
  rallye: Rallye;
  onCancel: () => void;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="dhbwStyle"
      size="default"
      aria-disabled={pending}
      disabled={pending}
    >
      {pending ? 'Wird gesendet…' : 'Speichern'}
    </Button>
  );
}

export default function RallyeCardForm({ rallye, onCancel }: RallyeFormProps) {
  const [formState, formAction] = useActionState(updateRallye, {
    errors: { message: '' },
  });
  const [name, setName] = useState<string>(rallye.name);
  const [status, setStatus] = useState<RallyeStatus>(rallye.status);
  const [date24, setDate24] = useState<Date | undefined>(
    new Date(rallye.end_time)
  );
  const [studiengang, setStudiengang] = useState<string>(rallye.studiengang);
  const [password, setPassword] = useState<string>(rallye.password);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const currentYear = new Date().getFullYear();
  const calendarStartMonth = new Date(currentYear, 0, 1);
  const calendarEndMonth = new Date(currentYear + 5, 11, 31);

  // Alle Status-Übergänge sind erlaubt
  const allStatuses: RallyeStatus[] = [
    'preparing',
    'running',
    'post_processing',
    'ended',
    'inactive',
  ];

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const result = await deleteRallye(rallye.id.toString());
      if (result.errors) {
        console.error(result.errors.message);
      } else {
        // Nach erfolgreichem Löschen zurück zur Übersicht
        onCancel();
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }

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
            <Label htmlFor={`rallye-${rallye.id}-status`}>
              Status der Rallye
            </Label>
            <RadioGroup
              name="status"
              value={status}
              onValueChange={(value) => setStatus(value as RallyeStatus)}
            >
              {allStatuses.map((statusOption) => (
                <div key={statusOption} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={statusOption}
                    id={`status-${statusOption}`}
                  />
                  <Label htmlFor={`status-${statusOption}`}>
                    {getRallyeStatusLabel(statusOption)}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div className="flex items-center space-x-2 mt-2">
            <Label
              htmlFor={`rallye-${rallye.id}-endtime`}
              className="w-32 shrink-0"
            >
              Ende der Rallye
            </Label>
            <DateTimePicker
              locale={de}
              hourCycle={24}
              value={date24}
              onChange={setDate24}
              startMonth={calendarStartMonth}
              endMonth={calendarEndMonth}
              className="flex-1 min-w-0 max-w-sm"
            />
          </div>
          <div className="flex items-center space-x-2 mt-2">
            <Label
              htmlFor={`rallye-${rallye.id}-studiengang`}
              className="w-32 shrink-0"
            >
              Studiengang
            </Label>
            <Input
              name="studiengang"
              value={studiengang}
              onChange={(e) => setStudiengang(e.target.value)}
              className="flex-1 min-w-0 max-w-sm"
            />
          </div>
          <div className="flex items-center space-x-2 mt-2">
            <Label
              htmlFor={`rallye-${rallye.id}-password`}
              className="w-32 shrink-0"
            >
              Passwort
            </Label>
            <Input
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 min-w-0 max-w-sm"
            />
          </div>

          {/* Button-Bereich mit Speichern und Löschen */}
          <div className="flex justify-between items-center mt-4">
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Löschen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Rallye löschen</DialogTitle>
                  <DialogDescription>
                    Sind Sie sicher, dass Sie die Rallye „{name}“ löschen
                    möchten? Diese Aktion kann nicht rückgängig gemacht werden.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteDialog(false)}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Wird gelöscht...' : 'Löschen'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <SaveButton />
          </div>
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
