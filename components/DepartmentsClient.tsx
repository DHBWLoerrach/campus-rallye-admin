'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import Department from '@/components/Department';
import DepartmentDialog from '@/components/DepartmentDialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type {
  Department as DepartmentType,
  LocationOption,
  RallyeOption,
} from '@/lib/types';

interface DepartmentsClientProps {
  departments: DepartmentType[];
  locationOptions: LocationOption[];
  locationNames: Map<number, string>;
  rallyeOptions: RallyeOption[];
  rallyeAssignmentsMap: Map<number, number[]>;
  userCountByDepartment: Map<number, number>;
}

export default function DepartmentsClient({
  departments,
  locationOptions,
  locationNames,
  rallyeOptions,
  rallyeAssignmentsMap,
  userCountByDepartment,
}: DepartmentsClientProps) {
  const isSingleSite = locationOptions.length === 1;
  const siteLabel = locationOptions[0]?.name || 'DHBW Lörrach';
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');

  const filteredDepartments =
    isSingleSite || selectedLocationId === 'all'
      ? departments
      : departments.filter(
          (dept) => dept.location_id.toString() === selectedLocationId
        );

  return (
    <div className="mx-auto w-full max-w-350 space-y-6 px-4 py-8">
      <Button
        render={<Link href="/admin" />}
        variant="outline"
        size="sm"
        className="w-fit"
      >
        ← Zurück zur Verwaltung
      </Button>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Bereiche</h1>
          <p className="text-muted-foreground">
            {isSingleSite
              ? `Bereiche für ${siteLabel} verwalten.`
              : `Bereiche am Standort ${siteLabel} verwalten.`}
          </p>
          <p className="text-sm text-muted-foreground">
            Bereiche sind z. B. Studiengänge (Maschinenbau, BWL-Handel),
            Studienzentren (SZI) oder allgemeine Bereiche (Marketing).
          </p>
        </div>
        <DepartmentDialog
          buttonStyle="ml-auto"
          locationOptions={locationOptions}
          rallyeOptions={rallyeOptions}
        />
      </div>

      {!isSingleSite && departments.length > 0 && (
        <div className="flex items-center space-x-4">
          <Label htmlFor="location-filter" className="text-sm font-medium">
            Filter nach Standort:
          </Label>
          <Select
            value={selectedLocationId}
            onValueChange={(value) => setSelectedLocationId(value ?? '')}
            items={[
              { value: 'all', label: 'Alle Standorte' },
              ...locationOptions.map((location) => ({
                value: location.id.toString(),
                label: location.name,
              })),
            ]}
          >
            <SelectTrigger className="w-62.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Standorte</SelectItem>
              {locationOptions.map((location) => (
                <SelectItem key={location.id} value={location.id.toString()}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {!departments || departments.length === 0 ? (
        <div className="flex min-h-96 flex-col items-center justify-center space-y-2 rounded-md border border-dashed border-border/60 bg-muted/20 p-8 text-center">
          <h2 className="text-lg font-medium text-foreground">
            Keine Bereiche
          </h2>
          <p className="text-sm text-muted-foreground">
            Den ersten Bereich anlegen, um zu beginnen.
          </p>
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div className="flex min-h-96 flex-col items-center justify-center space-y-2 rounded-md border border-dashed border-border/60 bg-muted/20 p-8 text-center">
          <h2 className="text-lg font-medium text-foreground">
            Keine Bereiche gefunden
          </h2>
          <p className="text-sm text-muted-foreground">
            Für den ausgewählten Standort wurden keine Bereiche gefunden.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDepartments.map((department) => (
            <Department
              key={department.id}
              department={department}
              locationOptions={locationOptions}
              locationName={
                isSingleSite
                  ? ''
                  : locationNames.get(department.location_id) || 'Unbekannt'
              }
              rallyeOptions={rallyeOptions}
              assignedRallyeIds={rallyeAssignmentsMap.get(department.id) || []}
              assignedUserCount={userCountByDepartment.get(department.id) || 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
