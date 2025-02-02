import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Check, ChevronDown, Plus, X } from "lucide-react"
import Image from "next/image"

interface Answer {
  id: number;
  correct: boolean;
  text?: string;
  question_id?: number;
}

interface Question {
  id: number;
  content: string;
  type: string;
  enabled: boolean;
  points?: number;
  hint?: string;
  category: string;
  answers: Answer[];
}

interface QuestionsTableProps {
  questions: Question[];
}

const QuestionsTable: React.FC<QuestionsTableProps> = ({ questions }) => {
  const [expandedRows, setExpandedRows] = useState<number[]>([]);

  const toggleRow = (questionId: number) => {
    setExpandedRows(current =>
      current.includes(questionId)
        ? current.filter(id => id !== questionId)
        : [...current, questionId]
    );
  };
  return (
    <>
      {/* <table className="min-w-full divide-y divide-gray-200">
            <thead>
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Typ</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Antworten</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {/* {questions.map((question) => ( */}
      {/* <tr key={5}>
                        <td className="px-6 py-4 whitespace-nowrap">Test</td>
                        <td className="px-6 py-4 whitespace-nowrap">multiple_choice</td>
                        <td className="px-6 py-4 whitespace-nowrap"> */}
      {/* <ul>
                                {question.answers.map((answer) => (
                                    <li key={answer.id}>{answer.content}</li>
                                ))}
                            </ul> */}
      {/* </td>
                    </tr>

            </tbody>
        </table>  */}


      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Frage</TableHead>
              <TableHead>Typ</TableHead>
              <TableHead className="w-20">Aktiv</TableHead>
              <TableHead className="w-20">Punkte</TableHead>
              <TableHead>Bild</TableHead>
              <TableHead>Kategorie</TableHead>
              <TableHead>Hinweis</TableHead>
            </TableRow>
          </TableHeader>
          {questions.map((question) => (
            <React.Fragment key={question.id}>
              <TableRow>
                <TableCell>
                  <ChevronDown
                    className={`w-4 h-4 cursor-pointer transition-transform ${expandedRows.includes(question.id) ? 'rotate-180' : ''
                      }`}
                    onClick={() => toggleRow(question.id)}
                  />
                </TableCell>
                <TableCell className="max-w-md truncate">{question.content}</TableCell>
                <TableCell>{question.type}</TableCell>
                <TableCell>
                  {question.enabled && <Check className="h-4 w-4 text-green-500" />}
                </TableCell>
                <TableCell>{question.points}</TableCell>
                <TableCell>
                  <Image
                    src=""
                    alt="Bild"
                    width={50}
                    height={50}
                    className="object-cover rounded"
                  />
                </TableCell>
                <TableCell>{question.category}</TableCell>
                <TableCell>{question.hint}</TableCell>
              </TableRow>
              {expandedRows.includes(question.id) && question.answers.map((answer) => (
                <TableRow key={answer.id} className="bg-muted/50">
                  <TableCell />
                  <TableCell colSpan={6}>
                    <div className="pl-6 flex items-center gap-2">
                      {answer.correct ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-red-500" />
                      )}
                      {answer.text}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </React.Fragment>
          ))}
          {/* <TableBody>
              <TableRow>
                <TableCell>
                  <ChevronDown className="w-4 h-4" />
                </TableCell>
                <TableCell>Wie heissen die beiden Leiter des Studienzentrums ...</TableCell>
                <TableCell>Hanser und Olaf</TableCell>
                <TableCell>Multiple Choice</TableCell>
                <TableCell>
                  <Check className="w-4 h-4" />
                </TableCell>
                <TableCell>5</TableCell>
                <TableCell></TableCell>
                <TableCell>Allgemein</TableCell>
                <TableCell></TableCell>
              </TableRow>
              <TableRow>
                <TableCell></TableCell>
                <TableCell>Wo steht diese Statue?</TableCell>
                <TableCell>Auditorium</TableCell>
                <TableCell>Bild</TableCell>
                <TableCell>
                  <Check className="w-4 h-4" />
                </TableCell>
                <TableCell>5</TableCell>
                <TableCell>
                  <Image
                    src=""
                    alt="Statue"
                    width={50}
                    height={50}
                    className="object-cover rounded"
                  />
                </TableCell>
                <TableCell>Allgemein</TableCell>
                <TableCell></TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <ChevronDown className="w-4 h-4" />
                </TableCell>
                <TableCell>Sucht einen schönen Ort auf dem Campusgelände und ...</TableCell>
                <TableCell>Ja</TableCell>
                <TableCell>Multiple Choice</TableCell>
                <TableCell>
                  <Check className="w-4 h-4" />
                </TableCell>
                <TableCell>8</TableCell>
                <TableCell></TableCell>
                <TableCell>Informatik</TableCell>
                <TableCell>
                  Sucht einen schönen Ort auf dem Campusgelände und macht ein Gruppenfoto. Mailt es uns an
                  apps@dhbw-loerrach.de. Habt ihr das Foto an uns gemailt?
                </TableCell>
              </TableRow>
            </TableBody> */}
        </Table>
      </div>
    </>
  );
};

export default QuestionsTable;