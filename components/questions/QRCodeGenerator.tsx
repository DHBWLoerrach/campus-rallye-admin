'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';

interface QRCodeGeneratorProps {
  questionId: number;
  questionContent: string;
  isOpen: boolean;
  onClose: () => void;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  questionId,
  questionContent,
  isOpen,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');

  useEffect(() => {
    if (isOpen && questionId) {
      // Small delay to ensure modal is fully rendered
      const timer = setTimeout(() => {
        generateQRCode();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, questionId]);

  const generateQRCode = async () => {
    try {
      // URL-Format für mobile App: campus-rallye://question/{id}
      const qrData = `campus-rallye://question/${questionId}`;
      
      // Generate QR code as data URL first (more reliable)
      const dataURL = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCodeDataURL(dataURL);
      
      // Then also render to canvas if available
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Set canvas dimensions
          canvas.width = 300;
          canvas.height = 300;
          
          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Create image from data URL and draw to canvas
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, 300, 300);
          };
          img.src = dataURL;
        }
      }
    } catch (error) {
      console.error('Fehler beim Generieren des QR-Codes:', error);
    }
  };

  const handleDownload = () => {
    if (qrCodeDataURL) {
      const link = document.createElement('a');
      link.download = `qr-code-frage-${questionId}.png`;
      link.href = qrCodeDataURL;
      link.click();
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && qrCodeDataURL) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR-Code für Frage ${questionId}</title>
            <style>
              body { 
                margin: 20px; 
                font-family: Arial, sans-serif;
                text-align: center;
              }
              .qr-container {
                display: inline-block;
                padding: 20px;
                border: 1px solid #ccc;
                margin: 20px;
              }
              .question-text {
                max-width: 300px;
                margin: 10px 0;
                word-wrap: break-word;
              }
              img {
                max-width: 300px;
                height: auto;
              }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <h2>QR-Code für Frage ${questionId}</h2>
              <img src="${qrCodeDataURL}" alt="QR-Code" />
              <div class="question-text">
                <strong>Frage:</strong><br/>
                ${questionContent.length > 100 ? questionContent.substring(0, 100) + '...' : questionContent}
              </div>
              <p><small>campus-rallye://question/${questionId}</small></p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            QR-Code für Frage {questionId}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* QR-Code Display */}
          <div className="flex justify-center p-4 bg-white border rounded-lg">
            {qrCodeDataURL ? (
              <img 
                src={qrCodeDataURL} 
                alt={`QR-Code für Frage ${questionId}`}
                style={{ width: '300px', height: '300px' }}
              />
            ) : (
              <div className="w-[300px] h-[300px] flex items-center justify-center border-2 border-dashed border-gray-300">
                <p className="text-gray-500">QR-Code wird generiert...</p>
              </div>
            )}
            {/* Hidden canvas for legacy compatibility */}
            <canvas
              ref={canvasRef}
              style={{ display: 'none' }}
            />
          </div>
          
          {/* Fragen-Info */}
          <div className="text-sm text-gray-600">
            <strong>Frage:</strong><br />
            {questionContent.length > 150 
              ? questionContent.substring(0, 150) + '...' 
              : questionContent
            }
          </div>
          
          {/* QR-Code-Daten */}
          <div className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded">
            campus-rallye://question/{questionId}
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Herunterladen
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Drucken
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRCodeGenerator;