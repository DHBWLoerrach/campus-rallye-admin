'use client';

import { useState } from 'react';
import type { Organization, Rallye } from '@/lib/types';
import OrganizationCard from './OrganizationCard';
import OrganizationDialog from './OrganizationDialog';
import OrganizationForm from './OrganizationForm';

interface OrganizationsManagementProps {
  organizations: Organization[];
  rallyes: Rallye[];
}

export default function OrganizationsManagement({ 
  organizations, 
  rallyes 
}: OrganizationsManagementProps) {
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  return (
    <>
      <div className="flex justify-end gap-4 mb-4">
        <OrganizationDialog rallyes={rallyes} />
      </div>

      {editingOrg ? (
        <OrganizationForm
          organization={editingOrg}
          rallyes={rallyes}
          onCancel={() => setEditingOrg(null)}
        />
      ) : (
        <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {organizations.length === 0 ? (
            <p className="text-muted-foreground col-span-full text-center py-8">
              Keine Organisationen vorhanden. Erstellen Sie eine neue Organisation.
            </p>
          ) : (
            organizations.map((org) => (
              <OrganizationCard
                key={org.id}
                organization={org}
                onEdit={() => setEditingOrg(org)}
              />
            ))
          )}
        </section>
      )}
    </>
  );
}
