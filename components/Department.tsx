'use client';

import { useState } from 'react';
import DepartmentCard from '@/components/DepartmentCard';
import DepartmentForm from '@/components/DepartmentForm';
import type { Department, OrganizationOption, RallyeOption } from '@/lib/types';

interface DepartmentProps {
  department: Department;
  organizationOptions: OrganizationOption[];
  organizationName: string;
  rallyeOptions: RallyeOption[];
  assignedRallyeIds: number[];
}

export default function Department({ department, organizationOptions, organizationName, rallyeOptions, assignedRallyeIds }: DepartmentProps) {
  const [editMode, setEditMode] = useState(false);

  return editMode ? (
    <DepartmentForm
      department={department}
      organizationOptions={organizationOptions}
      rallyeOptions={rallyeOptions}
      assignedRallyeIds={assignedRallyeIds}
      onCancel={() => setEditMode(false)}
    />
  ) : (
    <DepartmentCard
      department={department}
      organizationName={organizationName}
      onEdit={() => setEditMode(true)}
    />
  );
}