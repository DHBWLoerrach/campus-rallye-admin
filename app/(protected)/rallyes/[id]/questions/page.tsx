import Assignment from './Assignment';
import { notFound } from 'next/navigation';
import createClient from '@/lib/supabase';
import type { Question } from '@/helpers/questions';

interface PageProps {
  params: Promise<{ id: string }>;
}

type RallyeRow = { id: number; name: string };
type QuestionIdRow = { question_id: number };

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
  const rallye = data as RallyeRow;

  // Preload initial data server-side to avoid extra client POSTs
  const [assignedRes, votingRes, questionsRes] = await Promise.all([
    supabase
      .from('join_rallye_questions')
      .select('question_id')
      .eq('rallye_id', rallyeId),
    supabase.from('voting').select('question_id').eq('rallye_id', rallyeId),
    // Fetch questions with nested answers in one roundtrip
    supabase.from('questions').select('id, content, type, points, category'),
  ]);

  const initialSelectedQuestions = (
    (assignedRes.data ?? []) as QuestionIdRow[]
  ).map((r) => r.question_id);
  const initialVotingQuestions = ((votingRes.data ?? []) as QuestionIdRow[]).map(
    (r) => r.question_id
  );
  const categoriesSet = new Set<string>();
  const questions = (questionsRes.data ?? []) as Question[];
  questions.forEach((q) => {
    if (q.category) categoriesSet.add(q.category);
  });
  const initialCategories = Array.from(categoriesSet);

  return (
    <main className="m-4">
      <Assignment
        rallyeId={rallyeId}
        rallyeName={rallye.name}
        initialQuestions={questions}
        initialSelectedQuestions={initialSelectedQuestions}
        initialVotingQuestions={initialVotingQuestions}
        initialCategories={initialCategories}
      />
    </main>
  );
}
