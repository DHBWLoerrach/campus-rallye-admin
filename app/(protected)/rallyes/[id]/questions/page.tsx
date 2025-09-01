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

  // Preload initial data server-side to avoid extra client POSTs
  const [assignedRes, votingRes, categoriesRes, questionsRes] = await Promise.all([
    supabase
      .from('join_rallye_questions')
      .select('question_id')
      .eq('rallye_id', rallyeId),
    supabase
      .from('voting')
      .select('question_id')
      .eq('rallye_id', rallyeId),
    supabase
      .from('questions')
      .select('category')
      .not('category', 'is', null),
    // Fetch questions with nested answers in one roundtrip
    supabase
      .from('questions')
      .select(
        'id, content, type, enabled, points, hint, category, bucket_path, answers(id, correct, text)'
      ),
  ]);

  const initialSelectedQuestions = (assignedRes.data || []).map((r: any) => r.question_id as number);
  const initialVotingQuestions = (votingRes.data || []).map((r: any) => r.question_id as number);
  const categoriesSet = new Set<string>();
  (categoriesRes.data || []).forEach((c: any) => {
    if (c.category) categoriesSet.add(c.category as string);
  });
  const initialCategories = Array.from(categoriesSet);
  const initialQuestions = (questionsRes.data || []) as any[];

  return (
    <main className="m-4">
      <Assignment
        rallyeId={rallyeId}
        rallyeName={data.name as string}
        initialQuestions={initialQuestions as any}
        initialSelectedQuestions={initialSelectedQuestions}
        initialVotingQuestions={initialVotingQuestions}
        initialCategories={initialCategories}
      />
    </main>
  );
}
