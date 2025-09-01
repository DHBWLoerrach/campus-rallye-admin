import Assignment from './Assignment';
import { notFound } from 'next/navigation';
import createClient from '@/lib/supabase';

interface PageProps {
  params: { id: string };
}

export default async function Page({ params }: PageProps) {
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
  return (
    <main className="m-4">
      <Assignment rallyeId={rallyeId} rallyeName={data.name as string} />
    </main>
  );
}
