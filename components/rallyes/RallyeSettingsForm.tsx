'use client';

import { useState, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { updateRallye, deleteRallye } from '@/actions/rallye';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { parsePlannedEnd } from '@/lib/planned-end';
import { RALLYE_STATUSES, getRallyeStatusLabel } from '@/lib/types';
import type { DepartmentOption, Rallye, RallyeStatus } from '@/lib/types';

interface RallyeSettingsFormProps {
  rallye: Rallye;
  departmentOptions: DepartmentOption[];
  assignedDepartmentIds: number[];
}

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="dhbwStyle"
      size="default"
      className="cursor-pointer"
      aria-disabled={pending || disabled}
      disabled={pending || disabled}
    >
      {pending ? 'Wird gesendet…' : 'Speichern'}
    </Button>
  );
}

export default function RallyeSettingsForm({
  rallye,
  departmentOptions,
  assignedDepartmentIds,
}: RallyeSettingsFormProps) {
  const router = useRouter();
  const [formState, formAction] = useActionState(updateRallye, null);
  const [name, setName] = useState<string>(rallye.name);
  const [status, setStatus] = useState<RallyeStatus>(rallye.status);
  const initialEnd = parsePlannedEnd(rallye.end_time ?? '');
  const [endTime, setEndTime] = useState(
    initialEnd.kind === 'time' ? initialEnd.value : ''
  );
  const [password, setPassword] = useState<string>(rallye.password);
  const [showPassword, setShowPassword] = useState(false);
  const normalizedAssignedDepartmentIds = Array.from(
    new Set(assignedDepartmentIds)
  );
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>(
    normalizedAssignedDepartmentIds[0]
      ? String(normalizedAssignedDepartmentIds[0])
      : ''
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Empty clears the planned end. A native time input only ever yields '' or a
  // valid HH:MM value, so endIsInvalid is a fallback for browsers that render
  // type="time" as a plain text field; the server action validates again.
  const plannedEnd = parsePlannedEnd(endTime);
  const endIsInvalid = plannedEnd.kind === 'invalid';
  const isSaveDisabled =
    (departmentOptions.length > 0 && selectedDepartmentId.length === 0) ||
    endIsInvalid;

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const result = await deleteRallye(rallye.id.toString());
      if (!result.success) {
        console.error(result.error);
      } else {
        router.push('/rallyes');
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
        <form action={formAction} className="flex max-w-xl flex-col gap-4">
          <input type="hidden" name="id" value={rallye.id} />
          <input type="hidden" name="status" value={status} />
          {/* Only opt into department sync when there is something to assign.
              With no departments the select is hidden and no id can be chosen,
              so signalling a sync would make the server reject every save. */}
          {departmentOptions.length > 0 && (
            <input type="hidden" name="department_sync" value="1" />
          )}

          <div className="grid gap-2">
            <Label htmlFor={`rallye-${rallye.id}-name`}>Name</Label>
            <Input
              id={`rallye-${rallye.id}-name`}
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`rallye-${rallye.id}-endtime`}>
              Geplantes Ende
            </Label>
            <p className="text-sm text-muted-foreground">
              Nur zur Orientierung. Die Rallye endet erst, wenn du sie im Ablauf
              beendest.
            </p>
            <div className="flex items-center gap-2">
              <Input
                id={`rallye-${rallye.id}-endtime`}
                name="end_time"
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
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`rallye-${rallye.id}-password`}>Passwort</Label>
            <div className="flex max-w-sm items-center gap-2">
              <Input
                id={`rallye-${rallye.id}-password`}
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 min-w-0"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={
                  showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'
                }
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`rallye-${rallye.id}-department`}>Bereich</Label>
            {departmentOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Keine Bereiche vorhanden
              </p>
            ) : (
              <>
                <Select
                  value={selectedDepartmentId}
                  onValueChange={setSelectedDepartmentId}
                >
                  <SelectTrigger
                    id={`rallye-${rallye.id}-department`}
                    aria-label="Bereich"
                    className="max-w-sm"
                  >
                    <SelectValue placeholder="Bereich auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentOptions.map((department) => (
                      <SelectItem
                        key={department.id}
                        value={String(department.id)}
                      >
                        {department.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {normalizedAssignedDepartmentIds.length > 1 && (
                  <p className="text-sm text-muted-foreground">
                    Für diese Rallye waren mehrere Bereiche gespeichert. Beim
                    Speichern bleibt nur der gewählte Bereich.
                  </p>
                )}
              </>
            )}
            {selectedDepartmentId.length > 0 && (
              <input
                type="hidden"
                name="department_ids"
                value={selectedDepartmentId}
              />
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`rallye-${rallye.id}-status`}>
              Status manuell setzen (Experten-Modus)
            </Label>
            <p className="text-xs text-muted-foreground">
              Normalerweise über den Phasen-Button oben steuern. Manuelles
              Setzen kann Abstimmungen und Ergebnisse beeinflussen.
            </p>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as RallyeStatus)}
            >
              <SelectTrigger
                id={`rallye-${rallye.id}-status`}
                className="w-56"
                aria-label="Status"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RALLYE_STATUSES.map((statusOption) => (
                  <SelectItem key={statusOption} value={statusOption}>
                    {getRallyeStatusLabel(statusOption)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            {formState?.success === false && (
              <span className="text-sm text-destructive">
                {formState.error}
              </span>
            )}
            {formState?.success && formState.data?.message && (
              <span className="text-sm text-success">
                {formState.data.message}
              </span>
            )}
            <SaveButton disabled={isSaveDisabled} />
          </div>
        </form>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground">
            Rallye löschen
          </h2>
          <p className="text-xs text-muted-foreground">
            Entfernt die Rallye samt Fragen-Zuordnungen endgültig.
          </p>
        </div>
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground cursor-pointer"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Löschen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rallye löschen</DialogTitle>
              <DialogDescription>
                Sind Sie sicher, dass Sie die Rallye „{name}“ löschen möchten?
                Diese Aktion kann nicht rückgängig gemacht werden.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                className="cursor-pointer"
                onClick={() => setShowDeleteDialog(false)}
              >
                Abbrechen
              </Button>
              <Button
                variant="destructive"
                className="cursor-pointer"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Wird gelöscht...' : 'Löschen'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}
