'use client';

import { useState } from 'react';
import OrganizationCard from '@/components/OrganizationCard';
import OrganizationForm from '@/components/OrganizationForm';
import type { Organization, RallyeOption } from '@/lib/types';

interface OrganizationProps {
  organization: Organization;
  rallyeOptions: RallyeOption[];
  defaultRallyeName?: string;
}

export default function Organization({ organization, rallyeOptions, defaultRallyeName }: OrganizationProps) {
  const [editMode, setEditMode] = useState(false);

  return editMode ? (
    <OrganizationForm
      organization={organization}
      rallyeOptions={rallyeOptions}
      onCancel={() => setEditMode(false)}
    />
  ) : (
    <OrganizationCard
      organization={organization}
      defaultRallyeName={defaultRallyeName}
      onEdit={() => setEditMode(true)}
    />
  );
}