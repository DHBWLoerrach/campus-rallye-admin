'use client';

import { Building2, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Organization } from '@/lib/types';

interface OrganizationCardProps {
  organization: Organization;
  onEdit: () => void;
}

export default function OrganizationCard({ organization, onEdit }: OrganizationCardProps) {
  const departmentCount = organization.departments?.length ?? 0;

  return (
    <Card className="w-full max-w-md shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Building2 className="h-5 w-5" />
          {organization.name}
        </CardTitle>
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-sm font-medium">
            {departmentCount} {departmentCount === 1 ? 'Studiengang' : 'Studiengänge'}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Bearbeiten"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {organization.default_rallye && (
          <div className="flex items-center justify-between">
            <div className="text-muted-foreground">Standard-Rallye:</div>
            <div className="font-medium">{organization.default_rallye.name}</div>
          </div>
        )}
        {organization.departments && organization.departments.length > 0 && (
          <div className="pt-2 border-t">
            <div className="text-muted-foreground mb-2">Studiengänge/Abteilungen:</div>
            <div className="flex flex-wrap gap-1">
              {organization.departments.map((dept) => (
                <Badge key={dept.id} variant="outline" className="text-xs">
                  {dept.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
