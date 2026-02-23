'use client';

import { QRCodeSVG } from 'qrcode.react';
import type { Question } from '@/helpers/questions';

// Convert cm to pixels (96 DPI: 1 cm ≈ 37.8 px)
const cmToPx = (cm: number) => Math.round(cm * 37.8);

interface QRCodePrintViewProps {
  questions: Question[];
  sizeCm: number;
}

export default function QRCodePrintView({
  questions,
  sizeCm,
}: QRCodePrintViewProps) {
  const sizePx = cmToPx(sizeCm);

  return (
    <div className="qr-print-view hidden print:block">
      <div className="flex flex-wrap gap-8 justify-center">
        {questions.map((question) => {
          const qrText = question.answers?.[0]?.text ?? '';
          if (!qrText) return null;

          return (
            <QRCodePrintItem
              key={question.id}
              qrText={qrText}
              questionText={question.content}
              sizePx={sizePx}
            />
          );
        })}
      </div>
    </div>
  );
}

function QRCodePrintItem({
  qrText,
  questionText,
  sizePx,
}: {
  qrText: string;
  questionText: string;
  sizePx: number;
}) {
  return (
    <div className="qr-print-item flex flex-col items-center gap-2 p-2">
      <QRCodeSVG value={qrText} size={sizePx} level="M" />
      <p className="text-center text-xs max-w-[200px] leading-tight">
        {questionText}
      </p>
    </div>
  );
}
