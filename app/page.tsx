import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/actions/auth';

export default async function Home() {
  const supabase = createClient();
  const { data: rallyes } = await supabase.from('rallye').select();

  return (
    <>
      <form action={signOut}>
        <button
          className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          type="submit"
        >
          Abmelden
        </button>
      </form>
      <pre>{JSON.stringify(rallyes, null, 2)}</pre>
    </>
  );
}
