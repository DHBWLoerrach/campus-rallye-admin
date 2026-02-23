import { Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Department } from '@/lib/types';

interface DepartmentCardProps {
  department: Department;
  onEdit: () => void;
  organizationName: string;
}

export default function DepartmentCard({
  department,
  onEdit,
  organizationName,
}: DepartmentCardProps) {
  return (
    <Card
      className="group relative w-full overflow-hidden border-border/60 bg-card/90 transition-all hover:-translate-y-0.5 hover:shadow-[0_2px_0_rgba(0,0,0,0.04),0_12px_28px_rgba(0,0,0,0.12)]"
      role="button"
      aria-label={`Abteilung ${department.name} bearbeiten`}
    >
      <div
        className="absolute inset-x-0 top-0 h-1 bg-primary/80"
        aria-hidden="true"
      />
      <CardHeader className="relative pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="truncate font-semibold text-foreground">
            {department.name}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 transition-all duration-300 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            aria-label={`${department.name} bearbeiten`}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Organisation
            </Badge>
            <span className="truncate text-sm text-muted-foreground">
              {organizationName}
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Erstellt: {new Date(department.created_at).toLocaleDateString('de-DE')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}