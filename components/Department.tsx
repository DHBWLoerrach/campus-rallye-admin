'use client';

import { useState } from 'react';
import DepartmentCard from '@/components/DepartmentCard';
import DepartmentForm from '@/components/DepartmentForm';
import type { Department, OrganizationOption } from '@/lib/types';

interface DepartmentProps {
  department: Department;
  organizationOptions: OrganizationOption[];
  organizationName: string;
}

export default function Department({ department, organizationOptions, organizationName }: DepartmentProps) {
  const [editMode, setEditMode] = useState(false);

  return editMode ? (
    <DepartmentForm
      department={department}
      organizationOptions={organizationOptions}
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