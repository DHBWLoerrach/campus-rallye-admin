'use client';
import { useState, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DepartmentOption } from '@/lib/types';

// TODO: in RallyeForm we basically have the same button…
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

export default function RallyeDialog({
  buttonStyle,
  departmentOptions,
}: {
  buttonStyle: string;
  departmentOptions: DepartmentOption[];
}) {
  const [name, setName] = useState('');
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState(false);
  const [createdRallyeId, setCreatedRallyeId] = useState<number | null>(null);
  const [createdRallyeName, setCreatedRallyeName] = useState('');
  const handleCreate = async (
    state: Parameters<typeof createRallye>[0],
    formData: FormData
  ) => {
    const result = await createRallye(state, formData);
    if (result?.success && result.data?.rallyeId) {
      setCreatedRallyeId(result.data.rallyeId);
      setCreatedRallyeName((formData.get('name') as string) || '');
    }
    return result;
  };
  const [formState, formAction] = useActionState(handleCreate, null);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setName('');
      setSelectedDepartmentIds(new Set());
      setCreatedRallyeId(null);
      setCreatedRallyeName('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="dhbwStyle" className={buttonStyle}>
          Rallye erstellen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Rallye erstellen</DialogTitle>
          <DialogDescription>
            {createdRallyeId
              ? 'Rallye erstellt. Sie können jetzt Fragen zuordnen.'
              : 'Geben Sie einen Namen an, um eine neue Rallye anzulegen.'}
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
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid gap-2">
                <Label>Abteilungen zuordnen (optional)</Label>
                <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-border/60 bg-muted/30 p-3">
                  {departmentOptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Keine Abteilungen vorhanden</p>
                  ) : (
                    departmentOptions.map((dept) => (
                      <div key={dept.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`create-dept-${dept.id}`}
                          checked={selectedDepartmentIds.has(dept.id)}
                          onCheckedChange={(checked) => {
                            setSelectedDepartmentIds((prev) => {
                              const next = new Set(prev);
                              if (checked === true) next.add(dept.id);
                              else next.delete(dept.id);
                              return next;
                            });
                          }}
                        />
                        <Label htmlFor={`create-dept-${dept.id}`} className="text-sm">
                          {dept.name}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
                {Array.from(selectedDepartmentIds).map((id) => (
                  <input key={id} type="hidden" name="department_ids" value={id} />
                ))}
              </div>
            </div>
            <DialogFooter>
              <SaveButton disabled={name?.trim().length === 0} />
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
