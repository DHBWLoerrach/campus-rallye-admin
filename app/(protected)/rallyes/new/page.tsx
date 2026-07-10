import Link from 'next/link';
import createClient from '@/lib/supabase';
import RallyeCreateWizard from '@/components/rallyes/RallyeCreateWizard';
import { getUserContext } from '@/lib/user-context';
import { getLocalUser } from '@/lib/db/local-user';
import { Button } from '@/components/ui/button';
import type { DepartmentOption } from '@/lib/types';
import type { Question } from '@/helpers/questions';

async function getUserDepartmentId(): Promise<number | null> {
  try {
    const { uuid } = await getUserContext();
    return getLocalUser(uuid)?.department_id ?? null;
  } catch {
    return null;
  }
}

export default async function NewRallyePage() {
  const supabase = await createClient();
  const defaultDepartmentId = await getUserDepartmentId();

  const [{ data: departments }, { data: questionRows }] = await Promise.all([
    supabase.from('departments').select('id, name').order('name'),
    supabase
      .from('questions')
      .select(
        'id, content, type, point_value, category, solutionOptions:solution_options(id, correct, text)'
      ),
  ]);

  const questions = (questionRows ?? []) as Question[];
  const categories = Array.from(
    new Set(
      questions
        .map((question) => question.category)
        .filter((category): category is string => Boolean(category))
    )
  ).sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));

  return (
    <main className="mx-auto flex w-full max-w-350 flex-col gap-4 px-4 py-6">
      <section className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
        <div>
          <Button asChild variant="outline" size="sm">
            <Link href="/rallyes">← Zurück zu Rallyes</Link>
          </Button>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Rallyes
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            Neue Rallye erstellen
          </h1>
        </div>
      </section>
      <RallyeCreateWizard
        departmentOptions={(departments ?? []) as DepartmentOption[]}
        defaultDepartmentId={defaultDepartmentId}
        questions={questions}
        categories={categories}
      />
    </main>
  );
}
