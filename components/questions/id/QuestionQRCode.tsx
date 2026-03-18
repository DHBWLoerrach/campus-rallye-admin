'use client';

import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { slugify } from '@/lib/slug';

const QR_CAPACITY_ERROR = 'Text zu lang für QR-Code';

class QRCodeErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: () => void; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('QRCodeCanvas render error:', error, errorInfo);
    this.props.onError();
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

interface QuestionQRCodeProps {
  answerText: string;
  questionContent?: string;
  questionId?: number;
  previewSize?: number;
  downloadSize?: number;
}

const PREVIEW_SIZE = 200;
const DOWNLOAD_SIZE = 400;

export default function QuestionQRCode({
  answerText,
  questionContent,
  questionId,
  previewSize = PREVIEW_SIZE,
  downloadSize = DOWNLOAD_SIZE,
}: QuestionQRCodeProps) {
  const downloadCanvasRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prevAnswerText, setPrevAnswerText] = useState(answerText);

  const trimmed = answerText?.trim() ?? '';
  const canGenerate = trimmed.length > 0;

  if (prevAnswerText !== answerText) {
    setPrevAnswerText(answerText);
    setShowPreview(false);
    setError(null);
  }

  const getFilename = () => {
    const slug = questionContent?.trim()
      ? slugify(questionContent)
      : questionId
        ? `qr-code-${questionId}`
        : `qr-code-${Date.now()}`;
    return `${slug}.png`;
  };

  const handleGenerate = () => {
    if (!canGenerate) return;
    setError(null);
    setShowPreview(true);
  };

  const handleQRError = () => {
    setShowPreview(false);
    setError(QR_CAPACITY_ERROR);
  };

  const handleDownload = () => {
    if (!trimmed || !showPreview) return;
    setError(null);
    try {
      const container = downloadCanvasRef.current;
      const canvas = container?.querySelector('canvas');
      if (!canvas) return;
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = getFilename();
      link.click();
    } catch {
      setError(QR_CAPACITY_ERROR);
    }
  };

  return (
    <div className="space-y-3">
      <Label>QR-Code</Label>
      <p className="text-xs text-muted-foreground">
        QR-Code aus der Antwort generieren und als PNG herunterladen.
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={!canGenerate}
      >
        QR-Code generieren
      </Button>
      {showPreview && (
        <QRCodeErrorBoundary
          key={trimmed}
          onError={handleQRError}
          fallback={<p className="text-sm text-destructive">{QR_CAPACITY_ERROR}</p>}
        >
          <div className="space-y-3">
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
              <div style={{ width: previewSize, height: previewSize }}>
                <QRCodeCanvas value={trimmed} size={previewSize} level="M" />
              </div>
              <div
                ref={downloadCanvasRef}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: -9999,
                  width: downloadSize,
                  height: downloadSize,
                }}
              >
                <QRCodeCanvas value={trimmed} size={downloadSize} level="M" />
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleDownload}>
              PNG herunterladen
            </Button>
          </div>
        </QRCodeErrorBoundary>
      )}
    </div>
  );
}
