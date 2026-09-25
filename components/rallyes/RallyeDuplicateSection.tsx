'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Copy } from 'lucide-react';
import { duplicateRallye } from '@/actions/rallye';
import { Button } from '@/components/ui/button';

interface RallyeDuplicateSectionProps {
  rallyeId: number;
}

// Duplicating copies only name, department and questions, never run data, so
// it is safe in every status. Repeating a rallye is done by resetting it
// (ADR-0005); a copy is for parallel runs or variants.
export default function RallyeDuplicateSection({
  rallyeId,
}: RallyeDuplicateSectionProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-foreground">
          Rallye duplizieren
        </h2>
        <p className="text-xs text-muted-foreground">
          Erstellt einen neuen Entwurf mit demselben Bereich und denselben
          Fragen, zum Beispiel für eine parallele Gruppe. Teams, Team-Antworten
          und Upload-Fotos werden nicht übernommen.
        </p>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        className="cursor-pointer"
        onClick={handleDuplicate}
        disabled={isPending}
      >
        <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
        {isPending ? 'Wird dupliziert…' : 'Duplizieren'}
      </Button>
    </section>
  );
}
