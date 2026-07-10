import { notFound } from 'next/navigation';
import createClient from '@/lib/supabase';
import RallyeQuestionsManager, {
  type AssignedQuestion,
} from '@/components/rallyes/RallyeQuestionsManager';
import type { Question } from '@/helpers/questions';

interface PageProps {
  params: Promise<{ id: string }>;
}

type AssignmentRow = { question_id: number; is_voting: boolean | null };

export default async function RallyeQuestionsTab(props: PageProps) {
  const params = await props.params;
  const idStr = params.id;
  if (!/^\d+$/.test(idStr)) {
    notFound();
  }
  const rallyeId = Number(idStr);

  const supabase = await createClient();
  const { data: rallye } = await supabase
    .from('rallyes')
    .select('id')
    .eq('id', rallyeId)
    .maybeSingle();
  if (!rallye) {
    notFound();
  }

  const [assignmentsRes, questionsRes] = await Promise.all([
    supabase
      .from('rallye_questions')
      .select('question_id, is_voting')
      .eq('rallye_id', rallyeId),
    supabase
      .from('questions')
      .select(
        'id, content, type, points, hint, category, bucket_path, answers(id, correct, text)'
      ),
  ]);

  const assignments = (assignmentsRes.data ?? []) as AssignmentRow[];
  const questions = (questionsRes.data ?? []) as Question[];

  const votingByQuestionId = new Map(
    assignments.map((row) => [row.question_id, row.is_voting === true])
  );

  const byName = (a: Question, b: Question) =>
    (a.content ?? '').localeCompare(b.content ?? '', 'de', {
      sensitivity: 'base',
    });

  const assigned: AssignedQuestion[] = questions
    .filter((question) => votingByQuestionId.has(question.id))
    .sort(byName)
    .map((question) => ({
      question,
      isVoting: votingByQuestionId.get(question.id) === true,
    }));
  const available = questions
    .filter((question) => !votingByQuestionId.has(question.id))
    .sort(byName);

  const categories = Array.from(
    new Set(
      questions
        .map((question) => question.category)
        .filter((category): category is string => Boolean(category))
    )
  ).sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));

  return (
    <RallyeQuestionsManager
      rallyeId={rallyeId}
      initialAssigned={assigned}
      initialAvailable={available}
      categories={categories}
    />
  );
}
