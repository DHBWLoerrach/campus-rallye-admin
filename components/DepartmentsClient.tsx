'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Department from '@/components/Department';
import DepartmentDialog from '@/components/DepartmentDialog';
import { Label } from '@/components/ui/label';
import type { Department as DepartmentType, OrganizationOption } from '@/lib/types';

interface DepartmentsClientProps {
  departments: DepartmentType[];
  organizationOptions: OrganizationOption[];
  organizationNames: Map<number, string>;
}

export default function DepartmentsClient({ 
  departments, 
  organizationOptions,
  organizationNames
}: DepartmentsClientProps) {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string>('all');

  const filteredDepartments = selectedOrganizationId === 'all' 
    ? departments 
    : departments.filter(dept => dept.organization_id.toString() === selectedOrganizationId);

  return (
    <div className="mx-auto w-full max-w-350 space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Abteilungen</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Abteilungen und deren Organisationszugehörigkeit.
          </p>
        </div>
        <DepartmentDialog 
          buttonStyle="ml-auto"
          organizationOptions={organizationOptions}
        />
      </div>

      {departments.length > 0 && (
        <div className="flex items-center space-x-4">
          <Label htmlFor="organization-filter" className="text-sm font-medium">
            Filter nach Organisation:
          </Label>
          <Select
            value={selectedOrganizationId}
            onValueChange={setSelectedOrganizationId}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Organisationen</SelectItem>
              {organizationOptions.map((org) => (
                <SelectItem key={org.id} value={org.id.toString()}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {!departments || departments.length === 0 ? (
        <div className="flex min-h-96 flex-col items-center justify-center space-y-2 rounded-md border border-dashed border-border/60 bg-muted/20 p-8 text-center">
          <h2 className="text-lg font-medium text-foreground">Keine Abteilungen</h2>
          <p className="text-sm text-muted-foreground">
            Erstellen Sie Ihre erste Abteilung, um zu beginnen.
          </p>
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div className="flex min-h-96 flex-col items-center justify-center space-y-2 rounded-md border border-dashed border-border/60 bg-muted/20 p-8 text-center">
          <h2 className="text-lg font-medium text-foreground">Keine Abteilungen gefunden</h2>
          <p className="text-sm text-muted-foreground">
            Für die ausgewählte Organisation wurden keine Abteilungen gefunden.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDepartments.map((department) => (
            <Department
              key={department.id}
              department={department}
              organizationOptions={organizationOptions}
              organizationName={organizationNames.get(department.organization_id) || 'Unbekannt'}
            />
          ))}
        </div>
      )}
    </div>
  );
}