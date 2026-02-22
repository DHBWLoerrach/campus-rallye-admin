'use client';
import { useState, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { createDepartment } from '@/actions/department';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { OrganizationOption, RallyeOption } from '@/lib/types';

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

export default function DepartmentDialog({ 
  buttonStyle, 
  organizationOptions,
  rallyeOptions,
}: { 
  buttonStyle: string;
  organizationOptions: OrganizationOption[];
  rallyeOptions: RallyeOption[];
}) {
  const [name, setName] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [selectedRallyeIds, setSelectedRallyeIds] = useState<Set<number>>(new Set());
  const [open, setOpen] = useState(false);
  
  const handleCreate = async (
    state: Parameters<typeof createDepartment>[0],
    formData: FormData
  ) => {
    const result = await createDepartment(state, formData);
    if (result?.success && result.data?.departmentId) {
      setOpen(false);
      setName('');
      setOrganizationId('');
      setSelectedRallyeIds(new Set());
    }
    return result;
  };
  const [formState, formAction] = useActionState(handleCreate, null);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setName('');
      setOrganizationId('');
      setSelectedRallyeIds(new Set());
    }
  };

  const isNameEmpty = name.trim().length === 0;
  const isOrganizationEmpty = organizationId.length === 0;
  const isFormInvalid = isNameEmpty || isOrganizationEmpty;

  const handleRallyeToggle = (rallyeId: number, isChecked: boolean) => {
    setSelectedRallyeIds((prev) => {
      const next = new Set(prev);
      if (isChecked) next.add(rallyeId);
      else next.delete(rallyeId);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className={buttonStyle} variant="dhbwStyle" size="default">
          Abteilung erstellen
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neue Abteilung erstellen</DialogTitle>
          <DialogDescription>
            Geben Sie die Details für die neue Abteilung ein.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          {formState?.success === false && (
            <div
              className="mb-4 rounded-md border border-red-500/60 bg-red-50/60 px-3 py-2 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200"
              role="alert"
              aria-live="polite"
            >
              {formState.error}
            </div>
          )}
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="create-name">Name</Label>
              <Input
                id="create-name"
                name="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Abteilungsname"
                required
                aria-describedby={
                  formState?.success === false && formState.issues?.name 
                    ? 'create-name-error' 
                    : undefined
                }
              />
              {formState?.success === false && formState.issues?.name && (
                <div id="create-name-error" className="text-sm text-red-600 dark:text-red-400">
                  {formState.issues.name}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="create-organization">Organisation</Label>
              <Select
                name="organization_id"
                value={organizationId}
                onValueChange={setOrganizationId}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Organisation auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {organizationOptions.map((org) => (
                    <SelectItem key={org.id} value={org.id.toString()}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formState?.success === false && formState.issues?.organization_id && (
                <div className="text-sm text-red-600 dark:text-red-400">
                  {formState.issues.organization_id}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Rallyes zuordnen (optional)</Label>
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-border/60 bg-muted/30 p-3">
                {rallyeOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Keine Rallyes vorhanden</p>
                ) : (
                  rallyeOptions.map((rallye) => (
                    <div key={rallye.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`create-rallye-${rallye.id}`}
                        checked={selectedRallyeIds.has(rallye.id)}
                        onCheckedChange={(checked) =>
                          handleRallyeToggle(rallye.id, checked === true)
                        }
                      />
                      <Label htmlFor={`create-rallye-${rallye.id}`} className="text-sm">
                        {rallye.name}
                      </Label>
                    </div>
                  ))
                )}
              </div>
              {Array.from(selectedRallyeIds).map((id) => (
                <input key={id} type="hidden" name="rallye_ids" value={id} />
              ))}
            </div>
          </div>
          
          <DialogFooter>
            <SaveButton disabled={isFormInvalid} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}