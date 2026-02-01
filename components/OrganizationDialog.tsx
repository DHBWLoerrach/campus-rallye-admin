'use client';
import { useState, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { createOrganization } from '@/actions/organization';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { RallyeOption } from '@/lib/types';

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

export default function OrganizationDialog({ 
  buttonStyle, 
  rallyeOptions 
}: { 
  buttonStyle: string;
  rallyeOptions: RallyeOption[];
}) {
  const [name, setName] = useState('');
  const [defaultRallyeId, setDefaultRallyeId] = useState('none');
  const [open, setOpen] = useState(false);
  
  const handleCreate = async (
    state: Parameters<typeof createOrganization>[0],
    formData: FormData
  ) => {
    const result = await createOrganization(state, formData);
    if (result?.success && result.data?.organizationId) {
      setOpen(false);
      setName('');
      setDefaultRallyeId('none');
    }
    return result;
  };
  const [formState, formAction] = useActionState(handleCreate, null);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setName('');
      setDefaultRallyeId('none');
    }
  };

  const isNameEmpty = name.trim().length === 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className={buttonStyle} variant="dhbwStyle" size="default">
          Organisation erstellen
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neue Organisation erstellen</DialogTitle>
          <DialogDescription>
            Geben Sie die Details für die neue Organisation ein.
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
                placeholder="Organisationsname"
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
              <Label htmlFor="create-default-rallye">Standard-Rallye (optional)</Label>
              <Select
                name="default_rallye_id"
                value={defaultRallyeId}
                onValueChange={setDefaultRallyeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Keine Standard-Rallye" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine Standard-Rallye</SelectItem>
                  {rallyeOptions.map((rallye) => (
                    <SelectItem key={rallye.id} value={rallye.id.toString()}>
                      {rallye.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <SaveButton disabled={isNameEmpty} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}