import React from 'react';
import { 
  Dialog, 
  DialogTrigger, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription } from '@/components/ui/dialog';
import QuestionForm from './QuestionForm';

interface QuestionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void; // Adjust type based on your form data structure
  initialData?: any; // Adjust type based on your form data structure
}

const QuestionDialog: React.FC<QuestionDialogProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  return (<div className="margin-top-4">
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogTrigger asChild>
        <button className="hidden">Open Dialog</button>
      </DialogTrigger>
      <DialogContent className="margin-top-40">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Frage bearbeiten' : 'Neue Frage erstellen'}</DialogTitle>
          <DialogDescription>
            {initialData ? 'Bearbeite die bestehende Frage' : 'Füge eine neue Frage hinzu.'}
          </DialogDescription>
        </DialogHeader>
        <QuestionForm onSubmit={onSubmit} initialData={initialData} />
      </DialogContent>
    </Dialog>
    </div>
  );
};

export default QuestionDialog;