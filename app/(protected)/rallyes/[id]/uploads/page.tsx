import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getRallyeUploadAnswers } from '@/actions/upload-answers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import createClient from '@/lib/supabase';

interface PageProps {
  params: Promise<{ id: string }>;
}

type RallyeRow = { id: number; name: string };

export default async function Page(props: PageProps) {
  const params = await props.params;
  const idStr = params.id;
  if (!/^\d+$/.test(idStr)) {
    notFound();
  }
  const rallyeId = Number(idStr);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('rallye')
    .select('id,name')
    .eq('id', rallyeId)
    .maybeSingle();
  if (error || !data) {
    notFound();
  }
  const rallye = data as RallyeRow;

  const uploadResult = await getRallyeUploadAnswers(rallyeId);
  const uploadQuestions = uploadResult.success ? uploadResult.data ?? [] : [];

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/rallyes">Zurück zur Übersicht</Link>
          </Button>
        </div>
        <div className="space-y-1 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Rallye
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            Upload-Fotos
          </h1>
          <p className="text-sm text-muted-foreground">
            Rallye „{rallye.name}“
          </p>
        </div>
      </section>

      {!uploadResult.success && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {uploadResult.error}
        </div>
      )}

      {uploadResult.success && uploadQuestions.length === 0 ? (
        <section className="rounded-2xl border border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
          Keine Upload-Fragen für diese Rallye gefunden.
        </section>
      ) : (
        <section className="flex flex-col gap-6">
          {uploadQuestions.map((question) => {
            const teamIdsWithPhoto = new Set(
              question.answers.map((answer) => answer.teamId)
            );
            const totalTeams =
              teamIdsWithPhoto.size + question.teamsWithoutPhoto.length;
            return (
              <div
                key={question.id}
                className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm"
              >
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Upload-Frage
                  </p>
                  <h2 className="text-lg font-semibold text-foreground">
                    {question.content}
                  </h2>
                </div>

                {question.answers.length > 0 ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {question.answers.map((answer) => (
                      <div
                        key={answer.teamQuestionId}
                        className="overflow-hidden rounded-xl border border-border/60 bg-muted/30"
                      >
                        <div className="relative aspect-[4/3] bg-muted/40">
                          <Image
                            src={answer.signedUrl}
                            alt={`Upload von ${answer.teamName}`}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover"
                          />
                        </div>
                        <div className="border-t border-border/60 px-3 py-2 text-sm font-medium text-foreground">
                          {answer.teamName}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Noch keine Fotos hochgeladen.
                  </p>
                )}

                <div className="mt-6 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Teams ohne Foto
                  </p>
                  {totalTeams === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Keine Teams vorhanden.
                    </p>
                  ) : question.teamsWithoutPhoto.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {question.teamsWithoutPhoto.map((team) => (
                        <Badge key={team.id} variant="secondary">
                          {team.name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Alle Teams haben ein Foto hochgeladen.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}
