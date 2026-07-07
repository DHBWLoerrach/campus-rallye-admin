'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface RallyeTabsNavProps {
  rallyeId: number;
}

export default function RallyeTabsNav({ rallyeId }: RallyeTabsNavProps) {
  const pathname = usePathname();
  const base = `/rallyes/${rallyeId}`;
  const tabs = [
    { href: base, label: 'Fragen', exact: true },
    { href: `${base}/settings`, label: 'Einstellungen', exact: false },
    { href: `${base}/results`, label: 'Ergebnisse', exact: false },
    { href: `${base}/uploads`, label: 'Fotos', exact: false },
  ];

  return (
    <nav
      aria-label="Rallye-Bereiche"
      className="flex flex-wrap gap-1 border-b border-border/60"
    >
      {tabs.map((tab) => {
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'rounded-t-lg border-b-2 px-4 py-2 text-sm font-semibold transition-colors',
              isActive
                ? 'border-dhbw text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
