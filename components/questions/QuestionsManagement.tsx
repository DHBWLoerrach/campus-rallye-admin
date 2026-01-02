'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getQuestions } from '@/actions/question';
import { Button } from '@/components/ui/button';
import QuestionsTable from './QuestionsTable';
import type { Question } from '@/helpers/questions';
import SearchFilters from './SearchFilters';
import type { RallyeOption } from '@/lib/types';

interface Props {
  initialQuestions: Question[];
  categories: string[];
  rallyes: RallyeOption[];
}

export default function QuestionManagement({
  initialQuestions,
  categories,
  rallyes,
}: Props) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);

  const handleFilterChange = async (filters: {
    question?: string;
    answer?: string;
    type?: string;
    category?: string;
    rallyeId?: string;
    assigned?: boolean;
  }) => {
    const questionsResult = await getQuestions(filters);
    if (!questionsResult.success) {
      console.error(questionsResult.error);
      setQuestions([]);
      return;
    }
    const fetchedQuestions = questionsResult.data ?? [];
    setQuestions(fetchedQuestions);
  };

  // antworten wir empfelen Antworten nicht länger als ... Zeichen 50?

  if (!questions) {
    return <div>Loading...</div>;
  }

  // Recommend limiting answer length to ~50 characters? (TODO)

  if (!questions) return <div>Loading...</div>;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Fragen
          </p>
          <h1 className="text-2xl font-semibold text-foreground">
            Fragenkatalog
          </h1>
          <p className="text-sm text-muted-foreground">
            Suchen, filtern und bearbeiten.
          </p>
        </div>
        <Button asChild variant="dhbwStyle" className="w-full sm:w-auto">
          <Link href="/questions/new">
            <Plus className="w-4 h-4" />
            Erstellen
          </Link>
        </Button>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
        <SearchFilters
          onFilterChange={handleFilterChange}
          showAssignedToggle={false}
          categories={categories}
          rallyes={rallyes}
        />
        <QuestionsTable questions={questions} />
      </section>
    </div>
  );
}
