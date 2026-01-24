'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import { Question } from '@/helpers/questions';

interface BulkQRCodeGeneratorProps {
  questions: Question[];
  isOpen: boolean;
  onClose: () => void;
}

const BulkQRCodeGenerator: React.FC<BulkQRCodeGeneratorProps> = ({
  questions,
  isOpen,
  onClose,
}) => {
  const [qrCodes, setQrCodes] = useState<{ id: number; dataURL: string; content: string }[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (isOpen && questions.length > 0) {
      generateAllQRCodes();
    }
  }, [isOpen, questions]);

  const generateAllQRCodes = async () => {
    setIsGenerating(true);
    const codes: { id: number; dataURL: string; content: string }[] = [];

    for (const question of questions) {
      try {
        const qrData = `campus-rallye://question/${question.id}`;
        const dataURL = await QRCode.toDataURL(qrData, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        
        codes.push({
          id: question.id,
          dataURL,
          content: question.content
        });
      } catch (error) {
        console.error(`Fehler beim Generieren des QR-Codes für Frage ${question.id}:`, error);
      }
    }
    
    setQrCodes(codes);
    setIsGenerating(false);
  };

  const handlePrintAll = () => {
    if (qrCodes.length === 0) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const qrCodeGrid = qrCodes.map(qr => `
        <div class="qr-item">
          <h3>Frage ${qr.id}</h3>
          <img src="${qr.dataURL}" alt="QR-Code ${qr.id}" />
          <p class="question-text">${qr.content.length > 80 ? qr.content.substring(0, 80) + '...' : qr.content}</p>
          <small>campus-rallye://question/${qr.id}</small>
        </div>
      `).join('');

      printWindow.document.write(`
        <html>
          <head>
            <title>QR-Codes für ${qrCodes.length} Fragen</title>
            <style>
              body { 
                margin: 20px; 
                font-family: Arial, sans-serif;
              }
              .qr-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                gap: 20px;
                margin: 20px 0;
              }
              .qr-item {
                text-align: center;
                padding: 15px;
                border: 1px solid #ccc;
                page-break-inside: avoid;
              }
              .qr-item h3 {
                margin: 0 0 10px 0;
                font-size: 16px;
              }
              .qr-item img {
                width: 160px;
                height: 160px;
              }
              .question-text {
                font-size: 12px;
                margin: 10px 0;
                word-wrap: break-word;
                max-height: 40px;
                overflow: hidden;
              }
              .qr-item small {
                font-size: 10px;
                color: #666;
              }
              @media print {
                .qr-item {
                  break-inside: avoid;
                }
              }
            </style>
          </head>
          <body>
            <h1>QR-Codes für Campus Rallye Fragen</h1>
            <p>${qrCodes.length} Fragen</p>
            <div class="qr-grid">
              ${qrCodeGrid}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleDownloadPDF = () => {
    // Dies könnte mit jsPDF implementiert werden, für Einfachheit verwenden wir Print
    handlePrintAll();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            QR-Codes für {questions.length} Fragen
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {isGenerating ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p>QR-Codes werden generiert...</p>
            </div>
          ) : (
            <>
              {/* QR-Codes Grid */}
              <div className="max-h-96 overflow-y-auto">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
                  {qrCodes.map((qr) => (
                    <div key={qr.id} className="text-center border rounded p-3">
                      <h4 className="text-sm font-semibold mb-2">Frage {qr.id}</h4>
                      <img 
                        src={qr.dataURL} 
                        alt={`QR-Code ${qr.id}`} 
                        className="mx-auto mb-2"
                        style={{ width: '120px', height: '120px' }}
                      />
                      <p className="text-xs text-gray-600 truncate">
                        {qr.content.length > 50 ? qr.content.substring(0, 50) + '...' : qr.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 justify-end border-t pt-4">
                <Button variant="outline" onClick={handleDownloadPDF}>
                  <Download className="w-4 h-4 mr-2" />
                  Als PDF drucken
                </Button>
                <Button onClick={handlePrintAll}>
                  <Printer className="w-4 h-4 mr-2" />
                  Alle drucken
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkQRCodeGenerator;