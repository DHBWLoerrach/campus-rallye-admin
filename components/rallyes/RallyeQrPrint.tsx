'use client';

import { useState, useSyncExternalStore } from 'react';
import QRCodeErrorBoundary from '@/components/questions/QRCodeErrorBoundary';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { Button, buttonVariants } from '@/components/ui/button';
import type { QrPrintQuestion } from '@/lib/qr-print-questions';
import './rallye-qr-print.css';

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export default function RallyeQrPrint({
  rallyeId,
  rallyeName,
  questions,
}: {
  rallyeId: number;
  rallyeName: string;
  questions: QrPrintQuestion[];
}) {
  // Encode only in the browser so capacity errors reach the error boundary.
  const ready = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const [failed, setFailed] = useState(false);
  const missingValue = questions.some((question) => !question.value);
  const pages = Array.from(
    { length: Math.ceil(questions.length / 8) },
    (_, index) => questions.slice(index * 8, index * 8 + 8)
  );

  return (
    <main className="qr-print-preview">
      <div className="qr-print-controls space-y-4 p-6">
        <Link
          href={`/rallyes/${rallyeId}`}
          className={buttonVariants({ variant: 'outline' })}
        >
          ← Zurück zur Rallye
        </Link>
        <h1 className="text-2xl font-semibold">
          QR-Codes drucken: {rallyeName}
        </h1>
        <p>
          Bis zu acht QR-Codes pro DIN-A4-Seite. An den gestrichelten Linien
          ausschneiden.
        </p>
        <p className="text-sm text-muted-foreground">
          Im Druckdialog A4, Hochformat und 100 % Skalierung wählen; Kopf- und
          Fußzeilen ausschalten. Du kannst auch als PDF speichern.
        </p>
        {(missingValue || failed) && (
          <p role="alert" className="text-destructive">
            Die Druckvorlage ist unvollständig. Bitte korrigiere die markierten
            Fragen und lade die Vorschau erneut.
          </p>
        )}
        {questions.length === 0 ? (
          <p>
            Dieser Rallye sind keine QR-Code-Fragen oder Geocaching-Fragen mit
            QR-Eingabe zugeordnet.
          </p>
        ) : (
          <Button
            onClick={() => window.print()}
            disabled={!ready || missingValue || failed}
          >
            Drucken
          </Button>
        )}
      </div>
      <div className="qr-print-sheets">
        {pages.map((page, index) => (
          <section
            key={index}
            className="qr-print-sheet"
            aria-label={`Druckseite ${index + 1} von ${pages.length}`}
          >
            {page.map((question) => (
              <article key={question.id} className="qr-print-card">
                <p className="qr-print-rallye">{rallyeName}</p>
                <p className="qr-print-caption" title={question.content}>
                  Frage #{question.id}: {question.content}
                </p>
                {!question.value ? (
                  <p role="alert">
                    Keine ausgefüllte erste Lösungsoption vorhanden.
                  </p>
                ) : ready ? (
                  <QRCodeErrorBoundary
                    onError={() => setFailed(true)}
                    fallback={
                      <p role="alert">
                        QR-Code konnte nicht erzeugt werden. Bitte prüfe die
                        Lösungsoption dieser Frage.
                      </p>
                    }
                  >
                    <QRCodeSVG
                      value={question.value}
                      size={192}
                      level="M"
                      marginSize={4}
                      bgColor="#ffffff"
                      fgColor="#000000"
                      title={`QR-Code für Frage ${question.id}`}
                    />
                  </QRCodeErrorBoundary>
                ) : (
                  <p>QR-Code wird vorbereitet …</p>
                )}
              </article>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
