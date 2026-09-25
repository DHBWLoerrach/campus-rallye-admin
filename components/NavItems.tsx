'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Route } from '@/lib/types';
import {
  isRallyeQuestionContext,
  parseQuestionCreationContext,
  QUESTION_RALLYE_ID_PARAM,
  QUESTION_RETURN_TO_PARAM,
} from '@/lib/question-creation-context';

export default function NavItems({ routes }: { routes: Route[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isQuestionPage = /^\/questions\/[^/]+$/.test(pathname);
  const isRallyeQuestion =
    isQuestionPage &&
    isRallyeQuestionContext(
      pathname === '/questions/new',
      parseQuestionCreationContext(searchParams.get(QUESTION_RALLYE_ID_PARAM)),
      searchParams.get(QUESTION_RETURN_TO_PARAM) ?? ''
    );
  return (
    <>
      {routes.map((route) => {
        const isActive = isRallyeQuestion
          ? route.href === '/rallyes'
          : pathname === route.href || pathname.startsWith(`${route.href}/`);
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
