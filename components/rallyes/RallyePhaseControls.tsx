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
import { suggestRallyeCode } from '@/lib/rallye-code';
import { getNextRallyeTransition, type RallyeStatus } from '@/lib/types';

interface RallyePhaseControlsProps {
  rallyeId: number;
  status: RallyeStatus;
  hasVotingQuestions: boolean;
  // Assigned upload questions with a point value that are not voting questions.
  // Their points can never be awarded, so we warn before leaving "running".
  unmarkedUploadWithPoints?: number;
  // The stored rallye code. When empty, the start dialog asks for one because a
  // running team rallye needs a code for teams to join.
  rallyeCode?: string;
}

export default function RallyePhaseControls({
  rallyeId,
  status,
  hasVotingQuestions,
  unmarkedUploadWithPoints = 0,
  rallyeCode = '',
}: RallyePhaseControlsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [endTime, setEndTime] = useState('');
  // Prefill a suggestion only when the start dialog needs a code; done in a
  // lazy initializer so it stays stable across re-renders.
  const needsCode = status === 'ready' && rallyeCode.trim().length === 0;
  const [code, setCode] = useState(() =>
    needsCode ? suggestRallyeCode() : ''
  );
  const [isPending, startTransition] = useTransition();

  const transition = getNextRallyeTransition(status, hasVotingQuestions);
  // Only the start step offers a "geplant bis" time; other transitions don't.
  const showEndTime = status === 'ready';
  const codeIsMissing = needsCode && code.trim().length === 0;
  // Leaving "running" freezes team answers, so unmarked upload questions with
  // points can no longer be scored. Warn, but let the organizer proceed.
  const showUnmarkedUploadWarning =
    status === 'running' && unmarkedUploadWithPoints > 0;
  const plannedEnd = showEndTime
    ? parsePlannedEnd(endTime)
    : ({ kind: 'none' } as const);
  // A native time input only ever yields '' or a valid HH:MM value, so this
  // guard is a fallback for browsers that render type="time" as a plain text
  // field; the server action validates again regardless.
  const endIsInvalid = plannedEnd.kind === 'invalid';
  const plannedEndTime =
    plannedEnd.kind === 'time' ? plannedEnd.value : undefined;

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
    if (endIsInvalid || codeIsMissing) return;
    setError(null);
    startTransition(async () => {
      const result = await advanceRallyeStatus(
        rallyeId,
        transition.target,
        plannedEndTime,
        needsCode ? code.trim() : undefined
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
        <DialogTrigger
          render={
            <Button variant="dhbwStyle" className="cursor-pointer">
              {status === 'ready' && (
                <Play className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              {transition.actionLabel}
            </Button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{transition.actionLabel}</DialogTitle>
            <DialogDescription>{transition.confirmText}</DialogDescription>
          </DialogHeader>
          {showEndTime && (
            <div className="grid gap-2">
              <Label htmlFor="phase-endtime">Endet um (optional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="phase-endtime"
                  type="time"
                  step="60"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">Uhr</span>
              </div>
              {endIsInvalid && (
                <p className="text-xs text-destructive">
                  Bitte eine gültige Uhrzeit angeben, z. B. 18:30.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Nur zur Orientierung. Die Rallye endet erst, wenn du sie im
                Ablauf beendest.
              </p>
            </div>
          )}
          {needsCode && (
            <div className="grid gap-2">
              <Label htmlFor="phase-rallye-code">Rallye-Code</Label>
              <Input
                id="phase-rallye-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="max-w-sm"
              />
              {codeIsMissing && (
                <p className="text-xs text-destructive">
                  Für den Start wird ein Rallye-Code benötigt.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Teams benötigen diesen Code, um beizutreten. Mach ihn beim Start
                sichtbar (z. B. an Tafel oder Beamer).
              </p>
            </div>
          )}
          {showEndTime && !needsCode && (
            <div className="grid gap-1">
              <span className="text-sm font-medium text-foreground">
                Rallye-Code
              </span>
              <span className="font-mono text-lg font-semibold tracking-wide text-foreground">
                {rallyeCode}
              </span>
              <p className="text-xs text-muted-foreground">
                Teams benötigen diesen Code, um beizutreten. Mach ihn beim Start
                sichtbar (z. B. an Tafel oder Beamer).
              </p>
            </div>
          )}
          {showEndTime && (
            <p className="text-xs text-muted-foreground">
              Jedes Team spielt auf genau einem Gerät.
            </p>
          )}
          {showUnmarkedUploadWarning && (
            <div
              role="status"
              className="rounded-md border border-amber-500/50 bg-amber-50/60 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-200"
            >
              {unmarkedUploadWithPoints === 1
                ? 'Für 1 Upload-Frage mit Punktwert ist keine Abstimmung vorgesehen — diese Punkte kann kein Team erhalten.'
                : `Für ${unmarkedUploadWithPoints} Upload-Fragen mit Punktwert ist keine Abstimmung vorgesehen — diese Punkte kann kein Team erhalten.`}
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
              disabled={isPending || endIsInvalid || codeIsMissing}
            >
              {isPending ? 'Wird geändert…' : 'Bestätigen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
