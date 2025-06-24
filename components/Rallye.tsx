'use client';

import { useState } from 'react';
import RallyeCard from '@/components/RallyeCard';
import RallyeForm from '@/components/RallyeForm';
import type { Rallye } from '@/lib/types';

interface RallyeProps {
  rallye: Rallye;
}

export default function Rallye({ rallye }: RallyeProps) {
  const [editMode, setEditMode] = useState<boolean>(false);

  return editMode ? (
    <RallyeForm rallye={rallye} onCancel={() => setEditMode(false)} />
  ) : (
    <RallyeCard rallye={rallye} onEdit={() => setEditMode(true)} />
  );
}
