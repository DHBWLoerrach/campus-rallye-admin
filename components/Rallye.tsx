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
  departmentAssignmentsLoaded: boolean;
  typeLabel?: string;
  contextLabel?: string;
}

export default function Rallye({
  rallye,
  questionCount,
  uploadQuestionCount,
  departmentOptions,
  assignedDepartmentIds,
  departmentAssignmentsLoaded,
  typeLabel,
  contextLabel,
}: RallyeProps) {
  const [editMode, setEditMode] = useState<boolean>(false);

  return editMode ? (
    <RallyeForm
      rallye={rallye}
      onCancel={() => setEditMode(false)}
      departmentOptions={departmentOptions}
      assignedDepartmentIds={assignedDepartmentIds}
      departmentAssignmentsLoaded={departmentAssignmentsLoaded}
    />
  ) : (
    <RallyeCard
      rallye={rallye}
      questionCount={questionCount}
      uploadQuestionCount={uploadQuestionCount}
      typeLabel={typeLabel}
      contextLabel={contextLabel}
      onEdit={() => setEditMode(true)}
    />
  );
}
