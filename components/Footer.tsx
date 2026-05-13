import Link from 'next/link';

const legalLinks = [
  { href: '/impressum', label: 'Impressum' },
  { href: '/datenschutz', label: 'Datenschutzerklärung' },
  { href: '/nutzungsordnung', label: 'Nutzungsordnung' },
];

export default function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background/95">
      <div className="mx-auto flex w-full max-w-350 flex-col gap-3 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/"
          className="transition-colors hover:text-foreground hover:no-underline"
        >
          Campus Rallye Admin
        </Link>
        <nav aria-label="Rechtliches">
          <ul className="flex flex-wrap items-center gap-y-2 divide-x divide-border/60">
            {legalLinks.map((link) => (
              <li key={link.href} className="px-4 first:pl-0 last:pr-0">
                <Link
                  href={link.href}
                  className="transition-colors underline-offset-4 hover:text-foreground hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
