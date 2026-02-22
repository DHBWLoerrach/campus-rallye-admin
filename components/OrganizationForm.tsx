'use client';

import { useState, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { CircleX, Trash2 } from 'lucide-react';
import { updateOrganization, deleteOrganization } from '@/actions/organization';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Organization, RallyeOption } from '@/lib/types';

interface OrganizationFormProps {
  organization: Organization;
  onCancel: () => void;
  rallyeOptions: RallyeOption[];
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

export default function OrganizationForm({ organization, onCancel, rallyeOptions }: OrganizationFormProps) {
  const [formState, formAction] = useActionState(updateOrganization, null);
  const [name, setName] = useState<string>(organization.name);
  const [defaultRallyeId, setDefaultRallyeId] = useState<string>(
    organization.default_rallye_id?.toString() ?? 'none'
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const result = await deleteOrganization(organization.id.toString());
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
          Organisation bearbeiten
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
          <input type="hidden" name="id" value={organization.id} />
          
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
              placeholder="Organisationsname"
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
            <Label htmlFor="default_rallye_id">Campus-Tour (optional)</Label>
            <Select
              name="default_rallye_id"
              value={defaultRallyeId}
              onValueChange={setDefaultRallyeId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Keine Campus-Tour" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Keine Campus-Tour</SelectItem>
                {rallyeOptions.map((rallye) => (
                  <SelectItem key={rallye.id} value={rallye.id.toString()}>
                    {rallye.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  <DialogTitle>Organisation löschen</DialogTitle>
                  <DialogDescription>
                    Möchten Sie die Organisation &quot;{organization.name}&quot; wirklich löschen?
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