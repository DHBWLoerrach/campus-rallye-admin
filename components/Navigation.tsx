import { LogOut, Menu } from 'lucide-react';
import { Route } from '@/lib/types';
import { Button, buttonVariants } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import NavItems from '@/components/NavItems';
import DarkModeToggle from '@/components/DarkModeToggle';
import { getSignOutUrl } from '@/lib/sign-out-url';

const allRoutes: Route[] = [
  {
    href: '/rallyes',
    label: 'Rallyes',
  },
  {
    href: '/questions',
    label: 'Fragenkatalog',
  },
  {
    href: '/admin',
    label: 'Verwaltung',
  },
];

const adminOnlyRoutes = new Set(['/admin']);

export default async function Nav({ isAdmin }: { isAdmin: boolean }) {
  const signOutUrl = getSignOutUrl();
  const routes = isAdmin
    ? allRoutes
    : allRoutes.filter((r) => !adminOnlyRoutes.has(r.href));

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-350 items-center justify-between px-4">
        <nav className="hidden flex-col sm:flex sm:flex-row sm:items-center gap-2 text-sm font-semibold">
          <NavItems routes={routes} />
        </nav>
        <Sheet>
          <SheetTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 sm:hidden"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Navigationsmenü ein-/ausblenden</span>
              </Button>
            }
          />
          <SheetContent side="left">
            <nav className="grid gap-6 font-medium">
              <NavItems routes={routes} />
            </nav>
          </SheetContent>
        </Sheet>
        <div className="flex flex-1 flex-row justify-end gap-2">
          <a
            href={signOutUrl}
            className={buttonVariants({ variant: 'outline' })}
          >
            <span className="hidden sm:block">Abmelden</span>
            <LogOut className="sm:ml-2 h-[1.2rem] w-[1.2rem]" />
          </a>
          <DarkModeToggle />
        </div>
      </div>
    </header>
  );
}
