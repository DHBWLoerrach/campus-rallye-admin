'use client';

import { useState, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createRallye } from '@/actions/rallye';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type EventLocationOption = {
  id: number;
  name: string;
  hasEventDepartment: boolean;
};

interface EventRallyeDialogProps {
  buttonStyle: string;
  locations: EventLocationOption[];
  eventDepartmentIdByLocationId: Record<string, number>;
}

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="dhbwStyle"
      size="default"
      className="mt-4 cursor-pointer"
      aria-disabled={pending || disabled}
      disabled={pending || disabled}
    >
      {pending ? 'Wird gesendet…' : 'Speichern'}
    </Button>
  );
}

export default function EventRallyeDialog({
  buttonStyle,
  locations,
  eventDepartmentIdByLocationId,
}: EventRallyeDialogProps) {
  const router = useRouter();
  const isSingleSite = locations.length === 1;
  const singleSiteLocationName = locations[0]?.name ?? 'DHBW Lörrach';
  const defaultLocationId = isSingleSite ? String(locations[0].id) : '';
  const [name, setName] = useState('');
  const [locationId, setLocationId] = useState(defaultLocationId);
  const [open, setOpen] = useState(false);
  const [createdRallyeId, setCreatedRallyeId] = useState<number | null>(null);
  const [createdRallyeName, setCreatedRallyeName] = useState('');
  const selectedDepartmentId =
    locationId.length > 0
      ? eventDepartmentIdByLocationId[locationId]
      : undefined;

  const handleCreate = async (
    state: Parameters<typeof createRallye>[0],
    formData: FormData
  ) => {
    const result = await createRallye(state, formData);
    if (result?.success && result.data?.rallyeId) {
      setCreatedRallyeId(result.data.rallyeId);
      setCreatedRallyeName((formData.get('name') as string) || '');
      router.refresh();
    }
    return result;
  };
  const [formState, formAction] = useActionState(handleCreate, null);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setName('');
      setLocationId(defaultLocationId);
      setCreatedRallyeId(null);
      setCreatedRallyeName('');
    }
  };

  const hasLocations = locations.length > 0;
  const hasSelectedEventDepartment = selectedDepartmentId !== undefined;
  const isNameEmpty = name.trim().length === 0;
  const isLocationEmpty = locationId.length === 0;
  const isSaveDisabled =
    isNameEmpty ||
    isLocationEmpty ||
    !hasLocations ||
    !hasSelectedEventDepartment;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="dhbwStyle" className={buttonStyle}>
          Event erstellen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Event-Rallye erstellen</DialogTitle>
          <DialogDescription>
            {createdRallyeId
              ? 'Rallye erstellt. Sie können jetzt Fragen zuordnen.'
              : 'Wählen Sie einen Standort. Der Event-Bereich wird automatisch zugeordnet.'}
          </DialogDescription>
        </DialogHeader>
        {createdRallyeId ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {createdRallyeName
                ? `Rallye „${createdRallyeName}“ wurde erstellt.`
                : 'Rallye wurde erstellt.'}
            </p>
            <DialogFooter className="gap-2 sm:justify-end">
              <Button asChild variant="dhbwStyle" className="cursor-pointer">
                <Link
                  href={`/rallyes/${createdRallyeId}/questions`}
                  onClick={() => setOpen(false)}
                >
                  Fragen zuordnen
                </Link>
              </Button>
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => setOpen(false)}
              >
                Schließen
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form action={formAction}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="event-rallye-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="event-rallye-name"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="event-rallye-location" className="text-right">
                  Standort
                </Label>
                <div className="col-span-3">
                  {isSingleSite ? (
                    <p
                      id="event-rallye-location"
                      className="rounded-md border border-input bg-muted/40 px-3 py-2 text-sm"
                    >
                      {singleSiteLocationName}
                    </p>
                  ) : (
                    <Select value={locationId} onValueChange={setLocationId}>
                      <SelectTrigger
                        id="event-rallye-location"
                        aria-label="Standort"
                      >
                        <SelectValue placeholder="Standort auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem
                            key={location.id}
                            value={String(location.id)}
                          >
                            {location.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              {!hasLocations && (
                <p className="text-sm text-muted-foreground">
                  Keine Standorte verfügbar.
                </p>
              )}
              {!isLocationEmpty && !hasSelectedEventDepartment && (
                <p className="text-sm text-muted-foreground">
                  Für diesen Standort wurde kein passender Event-Bereich
                  gefunden.
                </p>
              )}
              {locationId.length > 0 && (
                <input type="hidden" name="location_id" value={locationId} />
              )}
              {hasSelectedEventDepartment && (
                <input
                  type="hidden"
                  name="department_ids"
                  value={selectedDepartmentId}
                />
              )}
            </div>
            <DialogFooter>
              <SaveButton disabled={isSaveDisabled} />
            </DialogFooter>
            {formState?.success === false && (
              <span className="text-sm text-red-500 ml-2">
                {formState.error}
              </span>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
