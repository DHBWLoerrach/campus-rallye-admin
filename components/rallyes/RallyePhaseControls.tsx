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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { parsePlannedEnd } from '@/lib/planned-end';
import { suggestRallyeCode } from '@/lib/rallye-code';
import {
  getNextRallyeTransition,
  isRallyeJoinable,
  type RallyeStatus,
} from '@/lib/types';

interface RallyePhaseControlsProps {
  rallyeId: number;
  status: RallyeStatus;
  hasVotingQuestions: boolean;
  // Assigned upload questions with a point value that are not voting questions.
  // Their points can never be awarded, so we warn before leaving "running".
  unmarkedUploadWithPoints?: number;
  // The stored rallye code. When empty, the dialog for entering a joinable
  // status (ready or running) asks for one because teams need it to join.
  rallyeCode?: string;
  // Assigned questions whose QR codes must be printed and placed on campus.
  // Shown as a reminder when finishing the draft.
  qrPrintCount?: number;
}

export default function RallyePhaseControls({
  rallyeId,
  status,
  hasVotingQuestions,
  unmarkedUploadWithPoints = 0,
  rallyeCode = '',
  qrPrintCount = 0,
}: RallyePhaseControlsProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [endTime, setEndTime] = useState('');
  const [code, setCode] = useState('');
  const [isPending, startTransition] = useTransition();

  const transition = getNextRallyeTransition(status, hasVotingQuestions);
  // Teams can join as soon as the rallye is ready, so the transition into a
  // joinable status needs a code (usually when finishing the draft).
  const entersJoinable =
    transition !== null && isRallyeJoinable(transition.target);
  const needsCode = entersJoinable && rallyeCode.trim().length === 0;
  // Only the start step offers a "geplant bis" time; other transitions don't.
  const showEndTime = status === 'ready';
  const codeIsMissing = needsCode && code.trim().length === 0;
  // Leaving "running" freezes team answers, so unmarked upload questions with
  // points can no longer be scored. Warn, but let the organizer proceed.
  const showUnmarkedUploadWarning =
    status === 'running' && unmarkedUploadWithPoints > 0;
  // Finishing the draft is the last step before the code can be shared, so it
  // is the natural moment to remind about printing and placing QR codes.
  const showQrPrintHint = status === 'draft' && qrPrintCount > 0;
  const plannedEnd = showEndTime
    ? parsePlannedEnd(endTime)
    : ({ kind: 'none' } as const);
  // A native time input only ever yields '' or a valid HH:MM value, so this
  // guard is a fallback for browsers that render type="time" as a plain text
  // field; the server action validates again regardless.
  const endIsInvalid = plannedEnd.kind === 'invalid';
  const plannedEndTime =
    plannedEnd.kind === 'time' ? plannedEnd.value : undefined;

  // Ended is the final phase and has no further step; repeating the rallye is
  // done by resetting it in the settings (ADR-0005).
  if (!transition) {
    return null;
  }

  // The status can change without remounting this component (e.g. after a
  // reset), so the code suggestion is prefilled when the dialog opens.
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && needsCode && code.trim().length === 0) {
      setCode(suggestRallyeCode());
    }
    setOpen(nextOpen);
  };

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
      <Dialog open={open} onOpenChange={handleOpenChange}>
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
                  Teams brauchen einen Rallye-Code, um beizutreten.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Teams benötigen diesen Code, um beizutreten. Mach ihn sichtbar,
                sobald die Teams beitreten sollen (z. B. an Tafel oder Beamer).
              </p>
            </div>
          )}
          {entersJoinable && !needsCode && (
            <div className="grid gap-1">
              <span className="text-sm font-medium text-foreground">
                Rallye-Code
              </span>
              <span className="font-mono text-lg font-semibold tracking-wide text-foreground">
                {rallyeCode}
              </span>
              <p className="text-xs text-muted-foreground">
                Teams benötigen diesen Code, um beizutreten. Mach ihn sichtbar,
                sobald die Teams beitreten sollen (z. B. an Tafel oder Beamer).
              </p>
            </div>
          )}
          {showEndTime && (
            <p className="text-xs text-muted-foreground">
              Jedes Team spielt auf genau einem Gerät.
            </p>
          )}
          {showQrPrintHint && (
            <div
              role="status"
              className="rounded-md border border-amber-500/50 bg-amber-50/60 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/20 dark:text-amber-200"
            >
              {qrPrintCount === 1
                ? 'Diese Rallye enthält 1 Frage mit QR-Code. Drucke den QR-Code vor dem Start und hänge ihn am Campus aus.'
                : `Diese Rallye enthält ${qrPrintCount} Fragen mit QR-Code. Drucke die QR-Codes vor dem Start und hänge sie am Campus aus.`}
            </div>
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
