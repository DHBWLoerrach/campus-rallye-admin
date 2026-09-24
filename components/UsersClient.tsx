'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { assignUserDepartment, setUserApproval } from '@/actions/local-users';
import { isApprovedUser } from '@/lib/approval';
import type { LocalUser } from '@/lib/db/local-user';
import type { DepartmentOption } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const NO_DEPARTMENT = 'none';

interface UsersClientProps {
  users: LocalUser[];
  departmentOptions: DepartmentOption[];
}

export default function UsersClient({
  users,
  departmentOptions,
}: UsersClientProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const departmentSelectOptions = [
    { value: NO_DEPARTMENT, label: 'Kein Bereich' },
    ...departmentOptions.map((department) => ({
      value: department.id.toString(),
      label: department.name,
    })),
  ];

  // Users waiting for approval first, otherwise keep the email order.
  const sortedUsers = [...users].sort(
    (a, b) => Number(isApprovedUser(a)) - Number(isApprovedUser(b))
  );
  const pendingCount = users.filter((user) => !isApprovedUser(user)).length;

  const handleApprovalChange = (userId: string, approved: boolean) => {
    setError(null);
    startTransition(async () => {
      const result = await setUserApproval(userId, approved);
      if (!result.success) {
        setError(result.error);
      }
    });
  };

  const handleChange = (userId: string, value: string) => {
    setError(null);
    startTransition(async () => {
      const result = await assignUserDepartment(
        userId,
        value === NO_DEPARTMENT ? null : Number(value)
      );
      if (!result.success) {
        setError(result.error);
      }
    });
  };

  return (
    <div className="mx-auto w-full max-w-350 space-y-6 px-4 py-8">
      <Link
        href="/admin"
        className={buttonVariants({
          variant: 'outline',
          size: 'sm',
          className: 'w-fit',
        })}
      >
        ← Zurück zur Verwaltung
      </Link>
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Nutzer</h1>
        <p className="text-muted-foreground">
          Neue Nutzer freischalten und Nutzern einen Bereich zuordnen. Der
          Bereich bestimmt, welche Rallyes im Fokus stehen.
        </p>
        {pendingCount > 0 && (
          <p className="text-sm font-medium text-foreground">
            {pendingCount === 1
              ? '1 Nutzer wartet auf Freischaltung'
              : `${pendingCount} Nutzer warten auf Freischaltung`}
          </p>
        )}
      </div>

      {error && (
        <div
          className="rounded-md border border-red-500/60 bg-red-50/60 px-3 py-2 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200"
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}

      {users.length === 0 ? (
        <div className="flex min-h-96 flex-col items-center justify-center space-y-2 rounded-md border border-dashed border-border/60 bg-muted/20 p-8 text-center">
          <h2 className="text-lg font-medium text-foreground">Keine Nutzer</h2>
          <p className="text-sm text-muted-foreground">
            Nutzer erscheinen hier nach ihrer ersten Anmeldung.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-Mail</TableHead>
              <TableHead>Registriert</TableHead>
              <TableHead>Zugang</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead>Bereich</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUsers.map((user) => {
              const isOrphaned =
                user.department_id !== null &&
                !departmentOptions.some((d) => d.id === user.department_id);
              return (
                <TableRow key={user.user_id}>
                  <TableCell>{user.email ?? '—'}</TableCell>
                  <TableCell>
                    {new Date(user.registered_at).toLocaleDateString('de-DE')}
                  </TableCell>
                  <TableCell>
                    {user.admin ? (
                      <span className="whitespace-nowrap text-sm text-muted-foreground">
                        Immer (Admin)
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={user.approved}
                          onCheckedChange={(checked) =>
                            handleApprovalChange(user.user_id, checked === true)
                          }
                          disabled={isPending}
                          aria-label={`Zugang für ${user.email ?? 'Nutzer'} freischalten`}
                        />
                        {user.approved ? (
                          <span className="text-sm">Freigeschaltet</span>
                        ) : (
                          <Badge>Wartet</Badge>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.admin && <Badge variant="outline">Admin</Badge>}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={
                        isOrphaned || user.department_id === null
                          ? NO_DEPARTMENT
                          : user.department_id.toString()
                      }
                      onValueChange={(value) =>
                        handleChange(user.user_id, value ?? NO_DEPARTMENT)
                      }
                      disabled={isPending}
                      items={departmentSelectOptions}
                    >
                      <SelectTrigger className="w-56">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {departmentSelectOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isOrphaned && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Bisheriger Bereich wurde gelöscht
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
