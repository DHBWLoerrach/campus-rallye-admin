'use client';

import { useState } from 'react';
import LocationCard from '@/components/LocationCard';
import LocationForm from '@/components/LocationForm';
import type { Location, RallyeOption } from '@/lib/types';

interface LocationProps {
  location: Location;
  rallyeOptions: RallyeOption[];
  defaultRallyeName?: string;
}

export default function Location({
  location,
  rallyeOptions,
  defaultRallyeName,
}: LocationProps) {
  const [editMode, setEditMode] = useState(false);

  return editMode ? (
    <LocationForm
      location={location}
      rallyeOptions={rallyeOptions}
      onCancel={() => setEditMode(false)}
    />
  ) : (
    <LocationCard
      location={location}
      defaultRallyeName={defaultRallyeName}
      onEdit={() => setEditMode(true)}
    />
  );
}
