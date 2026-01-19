'use client';

import { useState, useEffect, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { createDepartment } from '@/actions/department';
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
import { Organization } from '@/lib/types';

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

interface DepartmentDialogProps {
  organizations: Organization[];
}

export default function DepartmentDialog({ organizations }: DepartmentDialogProps) {
  const [name, setName] = useState('');
  const [organizationId, setOrganizationId] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [formState, formAction] = useActionState(createDepartment, {
    errors: { message: '' },
  });

  // Modal schließen und Form zurücksetzen, wenn erfolgreich gespeichert wurde
  useEffect(() => {
    if (formState?.success) {
      setOpen(false);
      setName('');
      setOrganizationId('');
    }
  }, [formState?.success]);

  const isDisabled = name?.trim().length === 0 || organizationId === '';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="dhbwStyle" disabled={organizations.length === 0}>
          Studiengang erstellen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Studiengang / Abteilung erstellen</DialogTitle>
        </DialogHeader>
        {organizations.length === 0 ? (
          <p className="text-muted-foreground py-4">
            Bitte erstellen Sie zuerst eine Organisation.
          </p>
        ) : (
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
                  placeholder="z.B. Wirtschaftsinformatik"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="organization_id" className="text-right">
                  Organisation
                </Label>
                <Select
                  value={organizationId}
                  onValueChange={setOrganizationId}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Organisation auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id.toString()}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="organization_id" value={organizationId} />
              </div>
            </div>
            <DialogFooter>
              <SaveButton disabled={isDisabled} />
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
        )}
      </DialogContent>
    </Dialog>
  );
}
