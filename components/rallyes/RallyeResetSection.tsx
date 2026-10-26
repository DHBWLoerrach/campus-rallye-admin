'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Download, RotateCcw } from 'lucide-react';
import { resetRallye, type RallyeRunDataSummary } from '@/actions/rallye';
import { Button, buttonVariants } from '@/components/ui/button';
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
import type { RallyeStatus } from '@/lib/types';

interface RallyeResetSectionProps {
  rallyeId: number;
  rallyeName: string;
  status: RallyeStatus;
  // null when the counts could not be loaded; the reset stays available.
  runDataSummary: RallyeRunDataSummary | null;
}

const pluralize = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`;

export default function RallyeResetSection({
  rallyeId,
  rallyeName,
  status,
  runDataSummary,
}: RallyeResetSectionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resetting a rallye that teams are currently playing is destructive
  // enough to require typing its name.
  const requiresNameConfirmation = status === 'running' || status === 'voting';
  const isConfirmed =
    !requiresNameConfirmation || confirmation.trim() === rallyeName.trim();

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setConfirmation('');
      setError(null);
    }
  }

  async function handleReset() {
    setIsResetting(true);
    setError(null);
    try {
      const result = await resetRallye(rallyeId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      handleOpenChange(false);
      router.refresh();
    } catch (resetError) {
      console.error('Fehler beim Zurücksetzen:', resetError);
      setError('Es ist ein Fehler aufgetreten');
    } finally {
      setIsResetting(false);
    }
  }

  const runDataList = runDataSummary
    ? `${pluralize(runDataSummary.teamCount, 'Team', 'Teams')}, ${pluralize(
        runDataSummary.teamAnswerCount,
        'Team-Antwort',
        'Team-Antworten'
      )} und ${pluralize(
        runDataSummary.uploadPhotoCount,
        'Upload-Foto',
        'Upload-Fotos'
      )}`
    : null;

  const lossDescription = runDataList
    ? `${runDataList} werden endgültig gelöscht.`
    : 'Alle Teams, Team-Antworten und Upload-Fotos werden endgültig gelöscht.';

  // An ended rallye keeps its run data, including personal photos, until it
  // is reset (see ADR-0005), so remind editors that it is still stored.
  const hasStoredRunData =
    runDataSummary !== null &&
    runDataSummary.teamCount +
      runDataSummary.teamAnswerCount +
      runDataSummary.uploadPhotoCount >
      0;
  const showStoredRunDataHint = status === 'ended' && hasStoredRunData;

  // The reset deletes the photos for good, so offer a last chance to keep
  // them. Hidden when the count is unknown, since the download might be empty.
  const uploadPhotoCount = runDataSummary?.uploadPhotoCount ?? 0;

  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">
          Rallye zurücksetzen
        </h2>
        <p className="text-xs text-muted-foreground">
          Löscht alle Teams, Team-Antworten und Upload-Fotos. Die Rallye kehrt
          mit ihren Fragen in den Entwurf zurück.
        </p>
        {showStoredRunDataHint && (
          <p className="text-xs font-medium text-foreground">
            Die Rallye ist abgeschlossen, aber {runDataList} sind noch
            gespeichert. Nach der Veranstaltung zurücksetzen, damit keine Fotos
            und Team-Daten liegen bleiben.
          </p>
        )}
      </div>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground cursor-pointer"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Zurücksetzen
            </Button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rallye zurücksetzen</DialogTitle>
            <DialogDescription>
              {lossDescription} Die Rallye „{rallyeName}“ steht danach wieder im
              Entwurf, Rallye-Code und geplantes Ende sind leer. Diese Aktion
              kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          {uploadPhotoCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Upload-Fotos vorher sichern?
              </p>
              {/* Plain anchor instead of next/link: the target is a route
                  handler that streams a file download. */}
              <a
                href={`/rallyes/${rallyeId}/uploads/download`}
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {pluralize(uploadPhotoCount, 'Foto', 'Fotos')} herunterladen
                (ZIP)
              </a>
            </div>
          )}
          {requiresNameConfirmation && (
            <div className="grid gap-2">
              <Label htmlFor={`rallye-${rallyeId}-reset-confirmation`}>
                Die Rallye wird gerade gespielt. Zum Bestätigen den Namen der
                Rallye eingeben:
              </Label>
              <Input
                id={`rallye-${rallyeId}-reset-confirmation`}
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                autoComplete="off"
              />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => handleOpenChange(false)}
            >
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              className="cursor-pointer"
              onClick={handleReset}
              disabled={isResetting || !isConfirmed}
            >
              {isResetting ? 'Wird zurückgesetzt...' : 'Zurücksetzen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
