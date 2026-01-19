'use client';

import { useState, useEffect, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { createOrganization } from '@/actions/organization';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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
import { Rallye } from '@/lib/types';

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="dhbwStyle"
      size="default"
      className="mt-4"
      aria-disabled={pending || disabled}
      disabled={pending || disabled}
    >
      {pending ? 'Wird gesendet…' : 'Speichern'}
    </Button>
  );
}

interface OrganizationDialogProps {
  rallyes: Rallye[];
}

export default function OrganizationDialog({ rallyes }: OrganizationDialogProps) {
  const [name, setName] = useState('');
  const [defaultRallyeId, setDefaultRallyeId] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [formState, formAction] = useActionState(createOrganization, {
    errors: { message: '' },
  });

  // Modal schließen und Form zurücksetzen, wenn erfolgreich gespeichert wurde
  useEffect(() => {
    if (formState?.success) {
      setOpen(false);
      setName('');
      setDefaultRallyeId('');
    }
  }, [formState?.success]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="dhbwStyle">Organisation erstellen</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Organisation erstellen</DialogTitle>
        </DialogHeader>
        <form action={formAction}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder="z.B. DHBW Lörrach"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="default_rallye_id" className="text-right">
                Standard-Rallye
              </Label>
              <Select
                value={defaultRallyeId || 'none'}
                onValueChange={(val) => setDefaultRallyeId(val === 'none' ? '' : val)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Optional auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Keine</SelectItem>
                  {rallyes.map((rallye) => (
                    <SelectItem key={rallye.id} value={rallye.id.toString()}>
                      {rallye.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="default_rallye_id" value={defaultRallyeId} />
            </div>
          </div>
          <DialogFooter>
            <SaveButton disabled={name?.trim().length === 0} />
          </DialogFooter>
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
      </DialogContent>
    </Dialog>
  );
}
