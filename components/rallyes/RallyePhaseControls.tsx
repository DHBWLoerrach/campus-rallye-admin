'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Play } from 'lucide-react';
import { advanceRallyeStatus, duplicateRallye } from '@/actions/rallye';
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
import { parsePlannedEnd } from '@/lib/planned-end';
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [endHour, setEndHour] = useState('');
  const [endMinute, setEndMinute] = useState('');
  const [isPending, startTransition] = useTransition();

  const transition = getNextRallyeTransition(status, hasVotingQuestions);
  // Only the start step offers a "geplant bis" time; other transitions don't.
  const showEndTime = status === 'inactive';
  const plannedEnd = showEndTime
    ? parsePlannedEnd(endHour, endMinute)
    : ({ kind: 'none' } as const);
  const endIsInvalid = plannedEnd.kind === 'invalid';
  const plannedEndIso = plannedEnd.kind === 'time' ? plannedEnd.iso : undefined;
  // Purely informational nudge; entering a past time never blocks the start.
  const endIsPast =
    plannedEnd.kind === 'time' &&
    new Date(plannedEnd.iso).getTime() < new Date().getTime();

  const handleDuplicate = () => {
    setError(null);
    startTransition(async () => {
      const result = await duplicateRallye(rallyeId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (result.data) {
        router.push(`/rallyes/${result.data.rallyeId}`);
      }
    });
  };

  if (!transition) {
    // Final phase: the only remaining action is creating a fresh copy (ADR-0002).
    return (
      <div className="flex flex-col items-start gap-2">
        <Button
          variant="outline"
          className="cursor-pointer"
          onClick={handleDuplicate}
          disabled={isPending}
        >
          <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
          {isPending ? 'Wird dupliziert…' : 'Duplizieren'}
        </Button>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  const handleConfirm = () => {
    if (endIsInvalid) return;
    setError(null);
    startTransition(async () => {
      const result = await advanceRallyeStatus(
        rallyeId,
        transition.target,
        plannedEndIso
      );
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
          {showEndTime && (
            <div className="grid gap-2">
              <Label htmlFor="phase-endtime-hour">
                Endet heute um (optional)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="phase-endtime-hour"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={23}
                  placeholder="18"
                  value={endHour}
                  onChange={(e) => setEndHour(e.target.value)}
                  className="w-16 text-center appearance-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  aria-label="Stunde"
                />
                <span className="select-none">:</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={59}
                  placeholder="00"
                  value={endMinute}
                  onChange={(e) => setEndMinute(e.target.value)}
                  className="w-16 text-center appearance-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  aria-label="Minute"
                />
                <span className="text-sm text-muted-foreground">Uhr</span>
              </div>
              {endIsInvalid && (
                <p className="text-xs text-destructive">
                  Bitte eine gültige Uhrzeit angeben (Stunde 0–23, Minute 0–59).
                </p>
              )}
              {endIsPast && (
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  Diese Uhrzeit liegt bereits in der Vergangenheit.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Nur zur Orientierung. Die Rallye endet erst, wenn du sie im
                Ablauf beendest.
              </p>
            </div>
          )}
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
              disabled={isPending || endIsInvalid}
            >
              {isPending ? 'Wird geändert…' : 'Bestätigen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
