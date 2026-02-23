'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { regenerateQRCode } from '@/actions/question';
import type { Answer } from '@/helpers/questions';

const SIZE_OPTIONS = [
  { value: '3', label: '3 cm' },
  { value: '5', label: '5 cm' },
  { value: '7', label: '7 cm' },
  { value: '10', label: '10 cm' },
] as const;

// Convert cm to pixels (96 DPI: 1 cm ≈ 37.8 px)
const cmToPx = (cm: number) => Math.round(cm * 37.8);

interface QRCodeDisplayProps {
  questionId: number;
  answer: Answer;
  questionText?: string;
}

export default function QRCodeDisplay({
  questionId,
  answer,
  questionText,
}: QRCodeDisplayProps) {
  const [sizeCm, setSizeCm] = useState('5');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qrText = answer.text ?? '';
  const generatedAt = answer.qr_generated_at;
  const sizePx = cmToPx(Number(sizeCm));

  const handleRegenerate = async () => {
    if (
      !window.confirm(
        'QR-Code wirklich neu generieren? Alle bereits gedruckten QR-Codes für diese Frage werden ungültig.'
      )
    ) {
      return;
    }

    setIsRegenerating(true);
    setError(null);
    try {
      const result = await regenerateQRCode(questionId);
      if (!result.success) {
        setError(result.error);
      } else {
        // Reload to get the new QR code
        window.location.reload();
      }
    } catch {
      setError('QR-Code konnte nicht neu generiert werden');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-card/80 p-4 sm:p-6">
      <Label>QR-Code</Label>

      {/* QR code display */}
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-lg border border-border/40 bg-white p-4 print:border-0 print:p-0">
          <QRCodeSVG value={qrText} size={sizePx} level="M" />
        </div>
        {questionText && (
          <p className="text-center text-sm text-muted-foreground max-w-xs">
            {questionText}
          </p>
        )}
      </div>

      {/* Generation timestamp */}
      {generatedAt && (
        <p className="text-center text-xs text-muted-foreground">
          Generiert am{' '}
          {new Date(generatedAt).toLocaleString('de-DE', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </p>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <Label htmlFor="qr-size" className="text-xs whitespace-nowrap">
            Größe:
          </Label>
          <Select value={sizeCm} onValueChange={setSizeCm}>
            <SelectTrigger id="qr-size" className="w-24 h-8 text-xs">
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
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePrint}
        >
          <Printer className="h-4 w-4 mr-1" aria-hidden="true" />
          Drucken
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          <RefreshCw
            className={`h-4 w-4 mr-1 ${isRegenerating ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          Neu generieren
        </Button>
      </div>

      {error && (
        <p className="text-center text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
