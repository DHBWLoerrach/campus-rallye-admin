'use client';

import { useState, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { CircleX, Trash2 } from 'lucide-react';
import { updateDepartment, deleteDepartment } from '@/actions/department';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { Department, OrganizationOption, RallyeOption } from '@/lib/types';

interface DepartmentFormProps {
  department: Department;
  onCancel: () => void;
  organizationOptions: OrganizationOption[];
  rallyeOptions: RallyeOption[];
  assignedRallyeIds: number[];
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="dhbwStyle"
      size="default"
      className="cursor-pointer"
      aria-disabled={pending}
      disabled={pending}
    >
      {pending ? 'Wird gesendet…' : 'Speichern'}
    </Button>
  );
}

export default function DepartmentForm({ department, onCancel, organizationOptions, rallyeOptions, assignedRallyeIds }: DepartmentFormProps) {
  const [formState, formAction] = useActionState(updateDepartment, null);
  const [name, setName] = useState<string>(department.name);
  const [organizationId, setOrganizationId] = useState<string>(
    department.organization_id.toString()
  );
  const [selectedRallyeIds, setSelectedRallyeIds] = useState<Set<number>>(
    new Set(assignedRallyeIds)
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleRallyeToggle = (rallyeId: number, isChecked: boolean) => {
    setSelectedRallyeIds((prev) => {
      const next = new Set(prev);
      if (isChecked) next.add(rallyeId);
      else next.delete(rallyeId);
      return next;
    });
  };

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const result = await deleteDepartment(department.id.toString());
      if (!result.success) {
        console.error(result.error);
      } else {
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
    <Card className="w-full max-w-md">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between gap-3">
          Abteilung bearbeiten
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
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={department.id} />
          
          {formState?.success === false && (
            <div
              className="rounded-md border border-red-500/60 bg-red-50/60 px-3 py-2 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200"
              role="alert"
              aria-live="polite"
            >
              {formState.error}
            </div>
          )}
          
          {formState?.success === true && (
            <div
              className="rounded-md border border-green-500/60 bg-green-50/60 px-3 py-2 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-200"
              role="alert"
              aria-live="polite"
            >
              {formState.data?.message}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Abteilungsname"
              required
              aria-describedby={
                formState?.success === false && formState.issues?.name 
                  ? 'name-error' 
                  : undefined
              }
            />
            {formState?.success === false && formState.issues?.name && (
              <div id="name-error" className="text-sm text-red-600 dark:text-red-400">
                {formState.issues.name}
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="organization_id">Organisation</Label>
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
            <Label>Rallyes zuordnen</Label>
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-border/60 bg-muted/30 p-3">
              {rallyeOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine Rallyes vorhanden</p>
              ) : (
                rallyeOptions.map((rallye) => (
                  <div key={rallye.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-rallye-${rallye.id}`}
                      checked={selectedRallyeIds.has(rallye.id)}
                      onCheckedChange={(checked) =>
                        handleRallyeToggle(rallye.id, checked === true)
                      }
                    />
                    <Label htmlFor={`edit-rallye-${rallye.id}`} className="text-sm">
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

          <div className="flex justify-between pt-4">
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogTrigger asChild>
                <Button type="button" variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Löschen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Abteilung löschen</DialogTitle>
                  <DialogDescription>
                    Möchten Sie die Abteilung &quot;{department.name}&quot; wirklich löschen?
                    Diese Aktion kann nicht rückgängig gemacht werden.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDeleteDialog(false)}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Wird gelöscht…' : 'Löschen'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <SaveButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}