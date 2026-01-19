'use client';

import { useState, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { CircleX, Trash2 } from 'lucide-react';
import { updateOrganization, deleteOrganization } from '@/actions/organization';
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
import type { Organization, Rallye } from '@/lib/types';

interface OrganizationFormProps {
  organization: Organization;
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

export default function OrganizationForm({ organization, rallyes, onCancel }: OrganizationFormProps) {
  const [formState, formAction] = useActionState(updateOrganization, {
    errors: { message: '' },
  });
  const [name, setName] = useState<string>(organization.name);
  const [defaultRallyeId, setDefaultRallyeId] = useState<string>(
    organization.default_rallye_id?.toString() ?? ''
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const result = await deleteOrganization(organization.id);
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

  return (
    <Card className="w-full max-w-md shadow-md">
      <CardHeader>
        <CardTitle className="flex justify-between items-center text-xl">
          Organisation bearbeiten
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
          <input type="hidden" name="id" value={organization.id} />
          
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
            <Label htmlFor="default_rallye_id" className="w-32 shrink-0">
              Standard-Rallye
            </Label>
            <Select
              value={defaultRallyeId || 'none'}
              onValueChange={(val) => setDefaultRallyeId(val === 'none' ? '' : val)}
            >
              <SelectTrigger className="flex-1 min-w-0 max-w-sm">
                <SelectValue placeholder="Keine" />
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
                  <DialogTitle>Organisation löschen</DialogTitle>
                  <DialogDescription>
                    Sind Sie sicher, dass Sie die Organisation "{name}" löschen
                    möchten? Alle zugehörigen Studiengänge/Abteilungen werden ebenfalls gelöscht. 
                    Diese Aktion kann nicht rückgängig gemacht werden.
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
