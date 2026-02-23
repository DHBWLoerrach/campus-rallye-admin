import { Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Organization } from '@/lib/types';

interface OrganizationCardProps {
  organization: Organization;
  onEdit: () => void;
  defaultRallyeName?: string;
}

export default function OrganizationCard({
  organization,
  onEdit,
  defaultRallyeName,
}: OrganizationCardProps) {
  return (
    <Card
      className="group relative w-full overflow-hidden border-border/60 bg-card/90 transition-all hover:-translate-y-0.5 hover:shadow-[0_2px_0_rgba(0,0,0,0.04),0_12px_28px_rgba(0,0,0,0.12)]"
      role="button"
      aria-label={`Organisation ${organization.name} bearbeiten`}
    >
      <div
        className="absolute inset-x-0 top-0 h-1 bg-primary/80"
        aria-hidden="true"
      />
      <CardHeader className="relative pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="truncate font-semibold text-foreground">
            {organization.name}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 transition-all duration-300 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            aria-label={`${organization.name} bearbeiten`}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {defaultRallyeName ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Campus-Tour
              </Badge>
              <span className="truncate text-sm text-muted-foreground">
                {defaultRallyeName}
              </span>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Keine Campus-Tour
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            Erstellt: {new Date(organization.created_at).toLocaleDateString('de-DE')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}