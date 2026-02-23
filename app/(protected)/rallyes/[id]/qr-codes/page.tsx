import createClient from '@/lib/supabase';
import { getQRCodeQuestionsForRallye } from '@/actions/question';
import QRCodesClient from './QRCodesClient';

interface QRCodesPageProps {
  params: Promise<{ id: string }>;
}

export default async function QRCodesPage({ params }: QRCodesPageProps) {
  const { id } = await params;
  const rallyeId = Number(id);

  if (Number.isNaN(rallyeId)) {
    return (
      <main className="mx-auto max-w-350 px-4 py-6">
        <p className="text-destructive">Ungültige Rallye-ID</p>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: rallye } = await supabase
    .from('rallye')
    .select('id, name')
    .eq('id', rallyeId)
    .maybeSingle();

  if (!rallye) {
    return (
      <main className="mx-auto max-w-350 px-4 py-6">
        <p className="text-destructive">Rallye nicht gefunden</p>
      </main>
    );
  }

  const result = await getQRCodeQuestionsForRallye(rallyeId);
  const questions = result.success ? (result.data ?? []) : [];

  return <QRCodesClient rallye={rallye} questions={questions} />;
}
