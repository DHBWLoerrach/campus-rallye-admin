type LegalPageProps = {
  title: string;
};

export default function LegalPage({ title }: LegalPageProps) {
  return (
    <main className="flex flex-1 items-center justify-center bg-background px-6 py-16">
      <section className="w-full max-w-3xl rounded-lg border border-border/60 bg-card p-8 text-left shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Rechtliches
        </p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight text-foreground">
          {title}
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Die Inhalte dieser Seite werden später ergänzt.
        </p>
      </section>
    </main>
  );
}
