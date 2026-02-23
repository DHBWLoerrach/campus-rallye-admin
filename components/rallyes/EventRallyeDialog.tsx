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

type EventOrganizationOption = {
  id: number;
  name: string;
  hasEventDepartment: boolean;
};

interface EventRallyeDialogProps {
  buttonStyle: string;
  organizations: EventOrganizationOption[];
  eventDepartmentIdByOrganizationId: Record<string, number>;
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
  organizations,
  eventDepartmentIdByOrganizationId,
}: EventRallyeDialogProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [open, setOpen] = useState(false);
  const [createdRallyeId, setCreatedRallyeId] = useState<number | null>(null);
  const [createdRallyeName, setCreatedRallyeName] = useState('');
  const selectedDepartmentId =
    organizationId.length > 0
      ? eventDepartmentIdByOrganizationId[organizationId]
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
      setOrganizationId('');
      setCreatedRallyeId(null);
      setCreatedRallyeName('');
    }
  };

  const hasOrganizations = organizations.length > 0;
  const hasSelectedEventDepartment = selectedDepartmentId !== undefined;
  const isNameEmpty = name.trim().length === 0;
  const isOrganizationEmpty = organizationId.length === 0;
  const isSaveDisabled =
    isNameEmpty ||
    isOrganizationEmpty ||
    !hasOrganizations ||
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
              : 'Wählen Sie eine Organisation. Die Event-Abteilung wird automatisch zugeordnet.'}
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
                <Label htmlFor="event-rallye-organization" className="text-right">
                  Organisation
                </Label>
                <div className="col-span-3">
                  <Select value={organizationId} onValueChange={setOrganizationId}>
                    <SelectTrigger id="event-rallye-organization" aria-label="Organisation">
                      <SelectValue placeholder="Organisation auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizations.map((organization) => (
                        <SelectItem key={organization.id} value={String(organization.id)}>
                          {organization.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {!hasOrganizations && (
                <p className="text-sm text-muted-foreground">
                  Keine Organisationen verfügbar.
                </p>
              )}
              {!isOrganizationEmpty && !hasSelectedEventDepartment && (
                <p className="text-sm text-muted-foreground">
                  Für diese Organisation wurde keine passende Event-Abteilung gefunden.
                </p>
              )}
              {organizationId.length > 0 && (
                <input type="hidden" name="organization_id" value={organizationId} />
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
              <span className="text-sm text-red-500 ml-2">{formState.error}</span>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
