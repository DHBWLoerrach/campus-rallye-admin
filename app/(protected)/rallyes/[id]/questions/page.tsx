import Assignment from './Assignment';
import { notFound } from 'next/navigation';
import createClient from '@/lib/supabase';

interface PageProps {
  params: Promise<{ id: string }>;
}

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

  // Preload initial data server-side to avoid extra client POSTs
  const [assignedRes, votingRes, questionsRes] = await Promise.all([
    supabase
      .from('join_rallye_questions')
      .select('question_id')
      .eq('rallye_id', rallyeId),
    supabase.from('voting').select('question_id').eq('rallye_id', rallyeId),
    // Try to fetch questions with category, fall back without it if column doesn't exist
    supabase.from('questions').select('id, content, type, points'),
  ]);

  const initialSelectedQuestions = (assignedRes.data || []).map(
    (r: any) => r.question_id as number
  );
  const initialVotingQuestions = (votingRes.data || []).map(
    (r: any) => r.question_id as number
  );
  const initialQuestions = (questionsRes.data || []) as any[];

  return (
    <main className="m-4">
      <Assignment
        rallyeId={rallyeId}
        rallyeName={data.name as string}
        initialQuestions={initialQuestions as any}
        initialSelectedQuestions={initialSelectedQuestions}
        initialVotingQuestions={initialVotingQuestions}
      />
    </main>
  );
}
