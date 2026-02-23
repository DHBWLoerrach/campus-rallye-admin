'use client';

import { useState } from 'react';
import RallyeCard from '@/components/RallyeCard';
import RallyeForm from '@/components/RallyeForm';
import type { DepartmentOption, Rallye } from '@/lib/types';
import type { RallyeUiType } from '@/lib/rallye-ui-type';

interface RallyeProps {
  rallye: Rallye;
  questionCount?: number;
  uploadQuestionCount?: number;
  departmentOptions: DepartmentOption[];
  assignedDepartmentIds: number[];
  departmentAssignmentsLoaded: boolean;
  typeLabel?: string;
  contextLabel?: string;
  rallyeUiType?: RallyeUiType;
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
  rallyeUiType,
}: RallyeProps) {
  const [editMode, setEditMode] = useState<boolean>(false);

  return editMode ? (
    <RallyeForm
      rallye={rallye}
      onCancel={() => setEditMode(false)}
      departmentOptions={departmentOptions}
      assignedDepartmentIds={assignedDepartmentIds}
      departmentAssignmentsLoaded={departmentAssignmentsLoaded}
      allowDepartmentAssignments={rallyeUiType !== 'event'}
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
