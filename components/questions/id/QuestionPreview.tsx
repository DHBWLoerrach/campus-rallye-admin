import Image from 'next/image';
import { Camera, ScanLine } from 'lucide-react';
import type { QuestionFormData } from '@/helpers/questions';
import { getQuestionMediaPublicUrl } from '@/lib/supabase-public';

interface QuestionPreviewProps {
  data: QuestionFormData;
}

export default function QuestionPreview({ data }: QuestionPreviewProps) {
  const solutionOptions = (data.solutionOptions ?? []).filter((option) =>
    option.text?.trim()
  );
  const showsTextInput =
    data.type === 'knowledge' ||
    data.type === 'picture' ||
    (data.type === 'geocaching' && data.geocaching?.input_type !== 'qr');
  const showsQrScanner =
    data.type === 'qr_code' ||
    (data.type === 'geocaching' && data.geocaching?.input_type === 'qr');

  return (
    <article
      aria-label="Vorschau der Team-Ansicht"
      className="mx-auto w-full max-w-lg overflow-hidden rounded-4xl border-4 border-foreground/10 bg-background shadow-inner"
    >
      <header className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-5 py-3">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Team-Ansicht
        </span>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
          Vorschau
        </span>
      </header>
      <div className="space-y-5 p-5 sm:p-6">
        <h3 className="text-xl font-semibold leading-snug text-foreground">
          {data.content.trim() || 'Frage noch nicht formuliert'}
        </h3>

        {data.type === 'picture' &&
          (data.bucket_path ? (
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-border/70 bg-muted/30">
              <Image
                src={getQuestionMediaPublicUrl(data.bucket_path)}
                alt={`Fragebild: ${data.content.trim() || 'Frage'}`}
                fill
                sizes="(max-width: 640px) 100vw, 480px"
                className="object-contain"
              />
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 text-center text-sm text-muted-foreground">
              Noch kein Fragebild vorhanden
            </div>
          ))}

        {data.type === 'multiple_choice' && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              Wähle eine Lösungsoption.
            </p>
            <ul className="space-y-2">
              {solutionOptions.map((option, index) => (
                <li
                  key={`${option.id ?? 'new'}-${index}`}
                  className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 text-sm text-foreground shadow-sm"
                >
                  <span
                    className="size-4 shrink-0 rounded-full border-2 border-muted-foreground/50"
                    aria-hidden="true"
                  />
                  {option.text?.trim()}
                </li>
              ))}
            </ul>
          </div>
        )}

        {showsTextInput && (
          <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground shadow-inner">
            Antwort eingeben
          </div>
        )}

        {showsQrScanner && (
          <div className="flex items-center gap-4 rounded-2xl border border-primary/25 bg-primary/5 p-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <ScanLine className="size-6" aria-hidden="true" />
            </span>
            <span className="space-y-1">
              <span className="block font-semibold text-foreground">
                QR-Code scannen
              </span>
              <span className="block text-sm text-muted-foreground">
                Richte die Kamera auf den gefundenen QR-Code.
              </span>
            </span>
          </div>
        )}

        {data.type === 'upload' && (
          <div className="flex items-center gap-4 rounded-2xl border border-primary/25 bg-primary/5 p-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Camera className="size-6" aria-hidden="true" />
            </span>
            <span className="space-y-1">
              <span className="block font-semibold text-foreground">
                Foto aufnehmen
              </span>
              <span className="block text-sm text-muted-foreground">
                Nimm ein Foto auf und lade es als Team-Antwort hoch.
              </span>
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
