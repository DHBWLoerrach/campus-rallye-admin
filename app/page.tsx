import { createClient } from '@/lib/supabase/server';
import Rallye from '@/components/Rallye';
import RallyeDialog from '@/components/RallyeDialog';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function Home() {
  const supabase = createClient();
  const { data: rallyes } = await supabase.from('rallye').select();

  return (
    <main className="flex flex-col m-4">
      <div className="flex justify-end gap-4 mb-4">
        <Link href="/rallye_questions">
          <Button variant="outline">Fragen zuordnen</Button>
        </Link>
        <RallyeDialog buttonStyle="mb-4 self-end" />
      </div>
      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {rallyes?.map((rallye) => <Rallye key={rallye.id} rallye={rallye} />)}
      </section>
    </main>
  );
}
