import { LogOut, Menu } from 'lucide-react';
import { Route } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import NavItems from '@/components/NavItems';
import DarkModeToggle from '@/components/DarkModeToggle';

const routes: Route[] = [
  {
    href: '/rallyes',
    label: 'Rallyes',
  },
  {
    href: '/questions',
    label: 'Fragen',
  },
];

export default async function Nav() {
  const isDev = process.env.NODE_ENV === 'development';
  return (
    <header className="sticky top-0 flex justify-between items-center h-16 border-b bg-background px-6">
      <nav className="hidden flex-col sm:flex sm:flex-row sm:items-center gap-2 text-sm font-medium">
        <NavItems routes={routes} />
      </nav>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 sm:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Navigationsmenü ein-/ausblenden</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          <nav className="grid gap-6 font-medium">
            <NavItems routes={routes} />
          </nav>
        </SheetContent>
      </Sheet>
      <div className="flex flex-1 flex-row justify-end gap-2">
        <a
          href={`/oauth2/sign_out${
            isDev ? '?rd=http%3A%2F%2Flocalhost%3A3000' : ''
          }`}
        >
          <Button variant="outline">
            <span className="hidden sm:block">Abmelden</span>
            <LogOut className="sm:ml-2 h-[1.2rem] w-[1.2rem]" />
          </Button>
        </a>
        <DarkModeToggle />
      </div>
    </header>
  );
}
