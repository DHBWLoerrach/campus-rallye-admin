'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getQuestions } from '@/actions/question';
import { Button } from '@/components/ui/button';
import QuestionsTable from './QuestionsTable';
import SearchFilters from './SearchFilters';

export default function QuestionManagement() {
  const [questions, setQuestions] = useState<any[]>();

  const handleFilterChange = async (filters: {
    question?: string;
    answer?: string;
    type?: string;
    category?: string;
    enabled?: boolean;
  }) => {
    let fetchedQuestions: Array<any> = [];
    fetchedQuestions = await getQuestions(filters);
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
          <SearchFilters onFilterChange={handleFilterChange} />
          <Link href="/questions/new">
            <Button className="bg-red-600 hover:bg-red-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              ERSTELLEN
            </Button>
          </Link>
        </div>
        <QuestionsTable questions={questions} />
      </div>
    </div>
  );
}
