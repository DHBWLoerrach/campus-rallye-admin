'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, QrCode } from 'lucide-react';
import { getQuestions } from '@/actions/question';
import { Button } from '@/components/ui/button';
import QuestionsTable from './QuestionsTable';
import type { Question } from '@/helpers/questions';
import SearchFilters from './SearchFilters';
import BulkQRCodeGenerator from './BulkQRCodeGenerator';

export default function QuestionManagement() {
  const [questions, setQuestions] = useState<Question[]>();
  const [showBulkQRCode, setShowBulkQRCode] = useState(false);

  const handleFilterChange = async (filters: {
    question?: string;
    answer?: string;
    type?: string;
    category?: string;
    assigned?: boolean;
  }) => {
    let fetchedQuestions: Question[] = await getQuestions(filters);
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
          <div className="flex gap-2">
            {questions && questions.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setShowBulkQRCode(true)}
              >
                <QrCode className="w-4 h-4 mr-2" />
                QR-Codes ({questions.length})
              </Button>
            )}
            <Link href="/questions/new">
              <Button className="bg-dhbw">
                <Plus className="w-4 h-4 mr-2" />
                ERSTELLEN
              </Button>
            </Link>
          </div>
        </div>
        <QuestionsTable questions={questions} />
        
        {/* Bulk QR Code Generator */}
        {questions && (
          <BulkQRCodeGenerator
            questions={questions}
            isOpen={showBulkQRCode}
            onClose={() => setShowBulkQRCode(false)}
          />
        )}
      </div>
    </div>
  );
}
