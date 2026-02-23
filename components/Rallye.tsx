'use client';

import { useState } from 'react';
import RallyeCard from '@/components/RallyeCard';
import RallyeForm from '@/components/RallyeForm';
import type { DepartmentOption, Rallye } from '@/lib/types';

interface RallyeProps {
  rallye: Rallye;
  questionCount?: number;
  uploadQuestionCount?: number;
  departmentOptions: DepartmentOption[];
  assignedDepartmentIds: number[];
}

export default function Rallye({
  rallye,
  questionCount,
  uploadQuestionCount,
  departmentOptions,
  assignedDepartmentIds,
}: RallyeProps) {
  const [editMode, setEditMode] = useState<boolean>(false);

  return editMode ? (
    <RallyeForm
      rallye={rallye}
      onCancel={() => setEditMode(false)}
      departmentOptions={departmentOptions}
      assignedDepartmentIds={assignedDepartmentIds}
    />
  ) : (
    <RallyeCard
      rallye={rallye}
      questionCount={questionCount}
      uploadQuestionCount={uploadQuestionCount}
      onEdit={() => setEditMode(true)}
    />
  );
}
