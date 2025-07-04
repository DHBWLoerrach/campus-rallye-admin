import Link from 'next/link';
import createClient from '@/lib/supabase';
import Rallye from '@/components/Rallye';
import RallyeDialog from '@/components/RallyeDialog';
import { Button } from '@/components/ui/button';

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
  return (
    <main className="flex flex-col m-4">
      <div className="flex justify-end gap-4 mb-4">
        <Link href="/rallye_questions">
          <Button variant="outline">Fragen zuordnen</Button>
        </Link>
        <RallyeDialog buttonStyle="mb-4 self-end" />
      </div>
      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {rallyes?.map((rallye) => (
          <Rallye key={rallye.id} rallye={rallye} />
        ))}
      </section>
    </main>
  );
}
