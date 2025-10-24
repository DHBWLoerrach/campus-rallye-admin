import createClient from '@/lib/supabase';
import Rallye from '@/components/Rallye';
import RallyeDialog from '@/components/RallyeDialog';

export default async function Home() {
  const supabase = await createClient();
  const { data: rallyes, error } = await supabase
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
  }
  return (
    <main className="flex flex-col m-4">
      <div className="flex justify-end gap-4 mb-4">
        <RallyeDialog buttonStyle="mb-4 self-end" />
      </div>
      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {rallyes?.map((rallye) => (
          <Rallye
            key={rallye.id}
            rallye={rallye}
            questionCount={questionCounts.get(rallye.id) ?? 0}
          />
        ))}
      </section>
    </main>
  );
}
