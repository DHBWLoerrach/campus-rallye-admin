'use client';

import { useState, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { CircleX, Trash2 } from 'lucide-react';
import { updateDepartment, deleteDepartment } from '@/actions/department';
import { assignDepartmentToRallye, removeDepartmentFromRallye } from '@/actions/rallye';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Checkbox } from '@/components/ui/checkbox';
import type { Department, Organization, Rallye } from '@/lib/types';

interface DepartmentFormProps {
  department: Department;
  organizations: Organization[];
  rallyes: Rallye[];
  onCancel: () => void;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="dhbwStyle"
      size="default"
      aria-disabled={pending}
      disabled={pending}
    >
      {pending ? 'Wird gesendet…' : 'Speichern'}
    </Button>
  );
}

export default function DepartmentForm({ department, organizations, rallyes, onCancel }: DepartmentFormProps) {
  const [formState, formAction] = useActionState(updateDepartment, {
    errors: { message: '' },
  });
  const [name, setName] = useState<string>(department.name);
  const [organizationId, setOrganizationId] = useState<string>(
    department.organization_id.toString()
  );
  const [assignedRallyes, setAssignedRallyes] = useState<Set<number>>(
    new Set(department.rallyes?.map(r => r.id) || [])
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const result = await deleteDepartment(department.id);
      if (result.errors) {
        console.error(result.errors.message);
      } else {
        onCancel();
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  async function handleRallyeToggle(rallyeId: number, checked: boolean) {
    if (checked) {
      await assignDepartmentToRallye(department.id, rallyeId);
      setAssignedRallyes(prev => new Set([...prev, rallyeId]));
    } else {
      await removeDepartmentFromRallye(department.id, rallyeId);
      setAssignedRallyes(prev => {
        const next = new Set(prev);
        next.delete(rallyeId);
        return next;
      });
    }
  }

  return (
    <Card className="w-full max-w-md shadow-md">
      <CardHeader>
        <CardTitle className="flex justify-between items-center text-xl">
          Studiengang bearbeiten
          <Button
            variant="ghost"
            size="icon"
            aria-label="Abbrechen"
            onClick={onCancel}
          >
            <CircleX className="h-4 w-4" aria-hidden="true" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <input type="hidden" name="id" value={department.id} />
          
          <div className="flex items-center space-x-2 mt-2">
            <Label htmlFor="name" className="w-32 shrink-0">
              Name
            </Label>
            <Input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 min-w-0 max-w-sm"
            />
          </div>

          <div className="flex items-center space-x-2 mt-2">
            <Label htmlFor="organization_id" className="w-32 shrink-0">
              Organisation
            </Label>
            <Select
              value={organizationId}
              onValueChange={setOrganizationId}
            >
              <SelectTrigger className="flex-1 min-w-0 max-w-sm">
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

          {/* Rallye-Zuordnungen */}
          <div className="mt-4 pt-4 border-t">
            <Label className="block mb-2">Rallye-Zuordnungen</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {rallyes.length === 0 ? (
                <p className="text-muted-foreground text-sm">Keine Rallyes vorhanden.</p>
              ) : (
                rallyes.map((rallye) => (
                  <div key={rallye.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`rallye-${rallye.id}`}
                      checked={assignedRallyes.has(rallye.id)}
                      onCheckedChange={(checked) => 
                        handleRallyeToggle(rallye.id, checked === true)
                      }
                    />
                    <Label 
                      htmlFor={`rallye-${rallye.id}`} 
                      className="font-normal cursor-pointer"
                    >
                      {rallye.name}
                    </Label>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Button-Bereich mit Speichern und Löschen */}
          <div className="flex justify-between items-center mt-4">
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Löschen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Studiengang löschen</DialogTitle>
                  <DialogDescription>
                    Sind Sie sicher, dass Sie den Studiengang "{name}" löschen
                    möchten? Diese Aktion kann nicht rückgängig gemacht werden.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteDialog(false)}
                  >
                    Abbrechen
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Wird gelöscht...' : 'Löschen'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <SaveButton />
          </div>
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
      </CardContent>
    </Card>
  );
}
