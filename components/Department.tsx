'use client';

import { useState } from 'react';
import DepartmentCard from '@/components/DepartmentCard';
import DepartmentForm from '@/components/DepartmentForm';
import type { Department, LocationOption, RallyeOption } from '@/lib/types';

interface DepartmentProps {
  department: Department;
  locationOptions: LocationOption[];
  locationName: string;
  rallyeOptions: RallyeOption[];
  assignedRallyeIds: number[];
}

export default function Department({
  department,
  locationOptions,
  locationName,
  rallyeOptions,
  assignedRallyeIds,
}: DepartmentProps) {
  const [editMode, setEditMode] = useState(false);

  return editMode ? (
    <DepartmentForm
      department={department}
      locationOptions={locationOptions}
      rallyeOptions={rallyeOptions}
      assignedRallyeIds={assignedRallyeIds}
      onCancel={() => setEditMode(false)}
    />
  ) : (
    <DepartmentCard
      department={department}
      locationName={locationName}
      onEdit={() => setEditMode(true)}
    />
  );
}
