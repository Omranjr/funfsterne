import Link from "next/link";

const NAV = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/impressum", label: "Impressum" },
  { href: "/support", label: "Support" },
];

export function LegalPageShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-16">
      <header className="mb-10 border-b border-border pb-6">
        <p className="text-sm font-medium text-muted-foreground">
          Fünf Sterne Friseur
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: {updated}
        </p>
        <nav className="mt-4 flex gap-4 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <article
        className="text-sm leading-relaxed text-foreground
          [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight
          [&_h2:first-child]:mt-0
          [&_p]:mb-4
          [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6
          [&_li]:mb-1
          [&_a]:underline [&_a]:underline-offset-4
          [&_strong]:font-semibold"
      >
        {children}
      </article>
    </main>
  );
}

export function TodoNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="not-prose mb-8 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      <strong className="font-semibold">Before publishing:</strong> {children}
    </div>
  );
}
