"use client"

import { Check, ChevronDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import Image from "next/image"

export default function QuestionManagement() {
  return (
    <div className="p-4 max-w-[1400px] mx-auto">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 flex-1">
            <Input placeholder="Suche (Frage)" className="max-w-[200px]" />
            <Input placeholder="Suche (Antwort)" className="max-w-[200px]" />
            <Select>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Typ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                <SelectItem value="qr-code">QR Code</SelectItem>
                <SelectItem value="bild">Bild</SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Studienbereich" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="allgemein">Allgemein</SelectItem>
                <SelectItem value="informatik">Informatik</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <Checkbox id="active" />
              <label htmlFor="active" className="text-sm">
                Nur aktive Fragen
              </label>
            </div>
          </div>
          <Button className="bg-red-600 hover:bg-red-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            ERSTELLEN
          </Button>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Frage</TableHead>
                <TableHead>Antwort</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead className="w-20">Aktiv</TableHead>
                <TableHead className="w-20">Punkte</TableHead>
                <TableHead>Bild</TableHead>
                <TableHead>Studienbereich (Kategorie)</TableHead>
                <TableHead>Multiple Choice Frage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
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
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

