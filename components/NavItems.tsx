'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Route } from '@/lib/types';

export default function NavItems({ routes }: { routes: Route[] }) {
  const pathname = usePathname();
  return (
    <>
      {routes.map((route) => {
        const isActive =
          pathname === route.href || pathname.startsWith(`${route.href}/`);
        return (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              'rounded-full px-3 py-1 transition-colors hover:bg-accent hover:text-foreground hover:no-underline',
              {
                'border-b-2 border-dhbw': isActive,
              }
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            {route.label}
          </Link>
        );
      })}
    </>
  );
}
