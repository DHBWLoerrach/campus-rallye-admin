'use client';

import { useState } from 'react';
import type { Department, Organization, Rallye } from '@/lib/types';
import DepartmentCard from './DepartmentCard';
import DepartmentDialog from './DepartmentDialog';
import DepartmentForm from './DepartmentForm';

interface DepartmentsManagementProps {
  departments: Department[];
  organizations: Organization[];
  rallyes: Rallye[];
}

export default function DepartmentsManagement({ 
  departments, 
  organizations,
  rallyes,
}: DepartmentsManagementProps) {
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  return (
    <>
      <div className="flex justify-end gap-4 mb-4">
        <DepartmentDialog organizations={organizations} />
      </div>

      {editingDept ? (
        <DepartmentForm
          department={editingDept}
          organizations={organizations}
          rallyes={rallyes}
          onCancel={() => setEditingDept(null)}
        />
      ) : (
        <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {departments.length === 0 ? (
            <p className="text-muted-foreground col-span-full text-center py-8">
              Keine Studiengänge/Abteilungen vorhanden. Erstellen Sie zuerst eine Organisation und dann einen Studiengang.
            </p>
          ) : (
            departments.map((dept) => (
              <DepartmentCard
                key={dept.id}
                department={dept}
                onEdit={() => setEditingDept(dept)}
              />
            ))
          )}
        </section>
      )}
    </>
  );
}
