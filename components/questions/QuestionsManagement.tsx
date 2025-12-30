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
    const fetchedQuestions: Question[] = await getQuestions(filters);
    setQuestions(fetchedQuestions);
  };

  // antworten wir empfelen Antworten nicht länger als ... Zeichen 50?

  if (!questions) {
    return <div>Loading...</div>;
  }

  // Recommend limiting answer length to ~50 characters? (TODO)

  if (!questions) return <div>Loading...</div>;

  return (
    <div className="p-4 max-w-[1400px] mx-auto">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <SearchFilters
            onFilterChange={handleFilterChange}
            showAssignedToggle={false}
            categories={categories}
            rallyes={rallyes}
          />
          <Button asChild variant="dhbwStyle">
            <Link href="/questions/new">
              <Plus className="w-4 h-4 mr-2" />
              Erstellen
            </Link>
          </Button>
        </div>

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
    </div>
  );
}
