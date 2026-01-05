import createClient from '@/lib/supabase';
import Rallye from '@/components/Rallye';
import RallyeDialog from '@/components/RallyeDialog';

export default async function Home() {
  const supabase = await createClient();
  const { data: rallyes } = await supabase
    .from('rallye')
    .select()
    .order('name');
  // supabase can't sort ignoring case, so we do it manually
  if (rallyes) {
    rallyes.sort((a, b) =>
      a.name.localeCompare(b.name, 'de', { sensitivity: 'base' })
    );
  }
  // Fetch question counts for all rallyes in a single query
  const questionCounts = new Map<number, number>();
  const uploadQuestionCounts = new Map<number, number>();
  if (rallyes && rallyes.length > 0) {
    const rallyeIds = rallyes.map((r) => r.id);
    const { data: joins } = await supabase
      .from('join_rallye_questions')
      .select('rallye_id, question_id')
      .in('rallye_id', rallyeIds);
    joins?.forEach((row) => {
      const current = questionCounts.get(row.rallye_id) ?? 0;
      questionCounts.set(row.rallye_id, current + 1);
    });
    const { data: uploadJoins } = await supabase
      .from('join_rallye_questions')
      .select('rallye_id, questions!inner(type)')
      .in('rallye_id', rallyeIds)
      .eq('questions.type', 'upload');
    uploadJoins?.forEach((row) => {
      const current = uploadQuestionCounts.get(row.rallye_id) ?? 0;
      uploadQuestionCounts.set(row.rallye_id, current + 1);
    });
  }
  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Rallyes
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            Rallyes verwalten
          </h1>
          <p className="text-sm text-muted-foreground">
            Erstellen, bearbeiten und Fragen zuordnen.
          </p>
        </div>
        <RallyeDialog buttonStyle="w-full sm:w-auto" />
      </section>
      <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {rallyes?.map((rallye) => (
          <Rallye
            key={rallye.id}
            rallye={rallye}
            questionCount={questionCounts.get(rallye.id) ?? 0}
            uploadQuestionCount={uploadQuestionCounts.get(rallye.id) ?? 0}
          />
        ))}
      </section>
    </main>
  );
}
