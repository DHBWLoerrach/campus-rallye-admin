import {
  Camera,
  ImageIcon,
  ListChecks,
  QrCode,
  TextCursorInput,
  type LucideIcon,
} from 'lucide-react';
import type { QuestionTypeIconName } from '@/helpers/questionTypes';

export const questionTypeIcons: Record<QuestionTypeIconName, LucideIcon> = {
  'text-input': TextCursorInput,
  'list-checks': ListChecks,
  image: ImageIcon,
  'qr-code': QrCode,
  camera: Camera,
};
