import { notFound } from 'next/navigation';
import createClient from '@/lib/supabase';
import { requireProfile } from '@/lib/require-profile';
import { getQrPrintQuestions, type QrPrintRow } from '@/lib/qr-print-questions';
import RallyeQrPrint from '@/components/rallyes/RallyeQrPrint';

export default async function RallyeQrPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireProfile();
  const { id } = await params;
  if (
    !/^\d+$/.test(id) ||
    !Number.isSafeInteger(Number(id)) ||
    Number(id) < 1
  ) {
    notFound();
  }
  const supabase = await createClient();
  const { data: rallye, error: rallyeError } = await supabase
    .from('rallyes')
    .select('id, name')
    .eq('id', Number(id))
    .maybeSingle();
  if (rallyeError) throw new Error('Rallye konnte nicht geladen werden.');
  if (!rallye) notFound();

  const { data: rows, error } = await supabase
    .from('rallye_questions')
    .select(
      'questions!inner(id, content, type, solution_options(text), geocaching_questions(input_type))'
    )
    .order('id', {
      referencedTable: 'questions.solution_options',
      ascending: true,
    })
    .eq('rallye_id', rallye.id);
  if (error) throw new Error('QR-Code-Fragen konnten nicht geladen werden.');

  return (
    <RallyeQrPrint
      rallyeId={rallye.id}
      rallyeName={rallye.name}
      questions={getQrPrintQuestions((rows ?? []) as QrPrintRow[])}
    />
  );
}
