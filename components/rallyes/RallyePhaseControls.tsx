'use client';

import { useState, useTransition } from 'react';
import { Play } from 'lucide-react';
import { advanceRallyeStatus } from '@/actions/rallye';
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
import { getNextRallyeTransition, type RallyeStatus } from '@/lib/types';

interface RallyePhaseControlsProps {
  rallyeId: number;
  status: RallyeStatus;
  hasVotingQuestions: boolean;
}

export default function RallyePhaseControls({
  rallyeId,
  status,
  hasVotingQuestions,
}: RallyePhaseControlsProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const transition = getNextRallyeTransition(status, hasVotingQuestions);
  if (!transition) {
    return null;
  }

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await advanceRallyeStatus(rallyeId, transition.target);
      if (!result.success) {
        setError(result.error);
      } else {
        setOpen(false);
      }
    });
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="dhbwStyle" className="cursor-pointer">
            {status === 'inactive' && (
              <Play className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {transition.actionLabel}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{transition.actionLabel}</DialogTitle>
            <DialogDescription>{transition.confirmText}</DialogDescription>
          </DialogHeader>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => setOpen(false)}
            >
              Abbrechen
            </Button>
            <Button
              variant="dhbwStyle"
              className="cursor-pointer"
              onClick={handleConfirm}
              disabled={isPending}
            >
              {isPending ? 'Wird geändert…' : 'Bestätigen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
