'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getQuestions } from '@/actions/question';
import { Button } from '@/components/ui/button';
import QuestionsTable from './QuestionsTable';
import type { Question } from '@/helpers/questions';
import SearchFilters from './SearchFilters';

export default function QuestionManagement() {
  const [questions, setQuestions] = useState<Question[]>();

  const handleFilterChange = async (filters: {
    question?: string;
    answer?: string;
    type?: string;
    category?: string;
    assigned?: boolean;
  }) => {
    const fetchedQuestions: Question[] = await getQuestions(filters);
    setQuestions(fetchedQuestions);
  };

  useEffect(() => {
    // Initial fetch
    handleFilterChange({});
  }, []);

  // antworten wir empfelen Antworten nicht länger als ... Zeichen 50?

  if (!questions) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4 max-w-[1400px] mx-auto">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <SearchFilters
            onFilterChange={handleFilterChange}
            showAssignedToggle={false}
          />
          <Button asChild className="bg-dhbw">
            <Link href="/questions/new">
              <Plus className="w-4 h-4 mr-2" />
              ERSTELLEN
            </Link>
          </Button>
        </div>
        <QuestionsTable questions={questions} />
      </div>
    </div>
  );
}
