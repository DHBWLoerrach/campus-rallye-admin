import { createClient } from '@/lib/supabase/server';
import Rallye from '@/components/Rallye';

export default async function Home() {
  const supabase = createClient();
  const { data: rallyes } = await supabase.from('rallye').select();

  return (
    <main className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 m-4">
      {rallyes.map((rallye) => (
        <Rallye key={rallye.id} rallye={rallye} />
      ))}
    </main>
  );
}
