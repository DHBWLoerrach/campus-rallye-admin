'use client';

import { useState } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import type { Question } from '@/helpers/questions';
import QRCodePrintView from '@/components/questions/QRCodePrintView';

const SIZE_OPTIONS = [
  { value: '3', label: '3 cm' },
  { value: '5', label: '5 cm' },
  { value: '7', label: '7 cm' },
  { value: '10', label: '10 cm' },
] as const;

// Convert cm to pixels (96 DPI: 1 cm ≈ 37.8 px)
const cmToPx = (cm: number) => Math.round(cm * 37.8);

interface QRCodesClientProps {
  rallye: { id: number; name: string };
  questions: Question[];
}

export default function QRCodesClient({
  rallye,
  questions,
}: QRCodesClientProps) {
  const [sizeCm, setSizeCm] = useState('5');
  const sizePx = cmToPx(Number(sizeCm));

  return (
    <>
      <main className="mx-auto flex w-full max-w-350 flex-col gap-6 px-4 py-6 print:hidden">
        {/* Header */}
        <section className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Link
              href="/rallyes"
              className="text-muted-foreground hover:text-foreground"
              aria-label="Zurück zu Rallyes"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {rallye.name}
              </p>
              <h1 className="text-2xl font-semibold text-foreground">
                QR-Codes
              </h1>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="qr-size-global" className="text-sm whitespace-nowrap">
                Größe:
              </Label>
              <Select value={sizeCm} onValueChange={setSizeCm}>
                <SelectTrigger id="qr-size-global" className="w-24 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIZE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="dhbwStyle"
              onClick={() => window.print()}
              disabled={questions.length === 0}
            >
              <Printer className="h-4 w-4 mr-2" aria-hidden="true" />
              Alle drucken ({questions.length})
            </Button>
          </div>
        </section>

        {/* QR code grid preview */}
        {questions.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-muted/30 p-8 text-center text-muted-foreground">
            Keine QR-Code-Fragen in dieser Rallye zugeordnet.
          </div>
        ) : (
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {questions.map((question) => {
              const qrText = question.answers?.[0]?.text ?? '';
              if (!qrText) return null;

              return (
                <div
                  key={question.id}
                  className="flex flex-col items-center gap-3 rounded-xl border border-border/60 bg-card/80 p-4"
                >
                  <div className="rounded-lg border border-border/40 bg-white p-3">
                    <QRCodeSVG value={qrText} size={sizePx} level="M" />
                  </div>
                  <p className="line-clamp-2 text-center text-sm text-foreground">
                    {question.content}
                  </p>
                  {question.answers?.[0]?.qr_generated_at && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(
                        question.answers[0].qr_generated_at
                      ).toLocaleString('de-DE', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  )}
                </div>
              );
            })}
          </section>
        )}
      </main>

      {/* Print-only view */}
      <QRCodePrintView questions={questions} sizeCm={Number(sizeCm)} />
    </>
  );
}
