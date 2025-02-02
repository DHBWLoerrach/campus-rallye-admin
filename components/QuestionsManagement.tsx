"use client"
import { getQuestions, createQuestion, updateQuestion, deleteQuestion } from "@/actions/question";
import QuestionsTable from "./questions/QuestionsTable"
import { useEffect, useState } from "react";
import SearchFilters from "./questions/SearchFilters";
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import QuestionDialog from "./questions/QuestionDialog";
import Link from "next/link";




export default function QuestionManagement() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(true);

  const handleFilterChange = async (filters: { question?: string, answer?: string, type?: string, category?: string }) => {
    let fetchedQuestions: Array<any> = [];
    fetchedQuestions = await getQuestions(filters);
    setQuestions(fetchedQuestions);
  };

  useEffect(() => {
    // Initial fetch
    handleFilterChange({ question: '', answer: '', type: '', category: '' }); // inhalt zum testen
  }, []);

  const handleSubmit = (newQuestion) => {
    // Add logic to save the question
    console.log('New question:', newQuestion);
  };

  // useEffect(() => {
  //   console.log("questions updated: ", questions);
  // }, [questions]);

  // const help = getQuestions();
  // console.log("help: ", Array.isArray(help));
  // console.log(help);
  // const help2 = updateQuestion(32, {
  //   content: "Wie heissen die beiden Leiter des Studienzentrums für Informatik und Wirtschaftsinformatik?",
  //   type: "multiple_choice",
  //   enabled: true,
  //   points: 5,
  //   hint: "Hanser und Olaf",
  //   answers: [
  //     { correct: true, text: "Susi und Peter" },
  //     { correct: false, text: "HpM und Behrends" },
  //     { correct: false, text: "bA bp und Olaf" },
  //   ]
  // });
  // deleteQuestion(32);

  // todo
  // multiple_choice question ausklappen und antworten anzeigen
  // multiple_choice spalte entfernen

  // antworten wir empfelen Antworten nicht länger als ... Zeichen 50?
  return (
    <div className="p-4 max-w-[1400px] mx-auto">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <SearchFilters onFilterChange={handleFilterChange} />
          <Link href="/questions/new">
            <Button className="bg-red-600 hover:bg-red-700 text-white">
              <Plus className="w-4 h-4 mr-2"/>
              ERSTELLEN
            </Button>
          </Link>
        </div>
        <QuestionsTable questions={questions} />
        {/* <QuestionDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} onSubmit={handleSubmit} /> */}
      </div>
    </div>

  )
}

