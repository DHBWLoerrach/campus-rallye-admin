import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/actions/auth';
import Rallye from '@/components/Rallye';

export default async function Home() {
  const supabase = createClient();
  const { data: rallyes } = await supabase.from('rallye').select();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <p>Hallo, {user.email}</p>
      <form action={signOut}>
        <button
          className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          type="submit"
        >
          Abmelden
        </button>
      </form>
      <main className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 m-4">
        {rallyes.map((rallye) => (
          <Rallye key={rallye.id} rallye={rallye} />
        ))}
      </main>
    </>
  );
}
