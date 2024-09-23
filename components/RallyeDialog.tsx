'use client';
import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import clsx from 'clsx';
import { createRallye } from '@/actions/rallye';
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

// TODO: in RallyeForm we basically have the same button…
function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={clsx(
        'bg-blue-500 text-white p-2 rounded hover:bg-blue-600 mt-4',
        {
          'bg-gray-300': disabled,
        }
      )}
      aria-disabled={pending || disabled}
      disabled={pending || disabled}
    >
      {pending ? 'Wird gesendet…' : 'Speichern'}
    </button>
  );
}

export default function RallyeDialog({
  buttonStyle,
}: {
  buttonStyle: string;
}) {
  const [name, setName] = useState('');
  const [formState, formAction] = useFormState(createRallye, null);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className={buttonStyle}>Rallye erstellen</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Rallye erstellen</DialogTitle>
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
              />
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
