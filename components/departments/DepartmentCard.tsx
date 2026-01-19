'use client';

import { GraduationCap, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Department } from '@/lib/types';

interface DepartmentCardProps {
  department: Department;
  onEdit: () => void;
}

export default function DepartmentCard({ department, onEdit }: DepartmentCardProps) {
  const rallyeCount = department.rallyes?.length ?? 0;

  return (
    <Card className="w-full max-w-md shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <GraduationCap className="h-5 w-5" />
          {department.name}
        </CardTitle>
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-sm font-medium">
            {rallyeCount} {rallyeCount === 1 ? 'Rallye' : 'Rallyes'}
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
        {department.organization && (
          <div className="flex items-center justify-between">
            <div className="text-muted-foreground">Organisation:</div>
            <div className="font-medium">{department.organization.name}</div>
          </div>
        )}
        {department.rallyes && department.rallyes.length > 0 && (
          <div className="pt-2 border-t">
            <div className="text-muted-foreground mb-2">Zugeordnete Rallyes:</div>
            <div className="flex flex-wrap gap-1">
              {department.rallyes.map((rallye) => (
                <Badge key={rallye.id} variant="outline" className="text-xs">
                  {rallye.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
