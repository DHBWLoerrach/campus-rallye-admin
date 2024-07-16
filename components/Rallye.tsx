'use client';

import { useState } from 'react';
import RallyeCard from '@/components/RallyeCard';
import RallyeForm from '@/components/RallyeForm';

export default function Rallye({ rallye }) {
  const [editMode, setEditMode] = useState<boolean>(false);
  return editMode ? (
    <RallyeForm rallye={rallye} onCancel={() => setEditMode(false)} />
  ) : (
    <RallyeCard rallye={rallye} onEdit={() => setEditMode(true)} />
  );
}
