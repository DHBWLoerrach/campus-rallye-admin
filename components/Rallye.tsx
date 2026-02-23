'use client';

import { useState } from 'react';
import RallyeCard from '@/components/RallyeCard';
import RallyeForm from '@/components/RallyeForm';
import type { Rallye } from '@/lib/types';

interface RallyeProps {
  rallye: Rallye;
  questionCount?: number;
  uploadQuestionCount?: number;
  qrCodeQuestionCount?: number;
}

export default function Rallye({
  rallye,
  questionCount,
  uploadQuestionCount,
  qrCodeQuestionCount,
}: RallyeProps) {
  const [editMode, setEditMode] = useState<boolean>(false);

  return editMode ? (
    <RallyeForm rallye={rallye} onCancel={() => setEditMode(false)} />
  ) : (
    <RallyeCard
      rallye={rallye}
      questionCount={questionCount}
      uploadQuestionCount={uploadQuestionCount}
      qrCodeQuestionCount={qrCodeQuestionCount}
      onEdit={() => setEditMode(true)}
    />
  );
}
