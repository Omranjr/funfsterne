# funfsterne-platform

A white-label loyalty and offers platform for barbershops. One codebase, one
API, one database — and one App Store listing, one brand and one isolated
island of data per customer.

## Structure

```
funfsterne/
├── apps/
│   ├── mobile/
│   │   ├── template/        master template, copied for each new customer
│   │   └── funfsterne/      customer #1 — Fünf Sterne (the original app)
│   ├── admin/               Next.js dashboard (one deployment per customer)
│   └── api/                 Fastify API, tenant-scoped
├── packages/
│   ├── core/                every shared screen, component, hook, API call
│   ├── db/                  Prisma schema + migrations
│   └── shared-types/        Zod schemas — the API contract
├── scripts/
└── docs/
```

Start with **[docs/WHITE_LABEL.md](docs/WHITE_LABEL.md)** — how theming,
config, feature switches and multi-tenancy fit together, and what is
deliberately *not* per-customer.

Two other documents worth reading before changing anything:

- **[packages/db/README.md](packages/db/README.md)** — the migration history
  does not describe the live database. Read this before running
  `prisma migrate`.
- **[docs/CODEBASE_AUDIT.md](docs/CODEBASE_AUDIT.md)** — the state of the
  codebase before the white-label restructure.

## Getting started

```bash
npm install
```

`postinstall` builds `@funfsterne/shared-types` and generates the Prisma
client, both of which the other workspaces need to typecheck.

## Everyday commands

```bash
npm run check              # brand-free check + typecheck, everywhere
npm run typecheck
npm run api:dev
npm run admin:dev
npm run dev -- --filter=@funfsterne/funfsterne
```

## Adding a customer

```bash
./scripts/new-customer.sh marco-salon "Marco's Salon"
```

The script prints the remaining steps. Full detail in
[docs/WHITE_LABEL.md](docs/WHITE_LABEL.md).

## Database

```bash
npm run db:generate
npm run db:validate
npm run db:migrate         # dev — read packages/db/README.md first
npm run db:migrate:deploy  # prod
npm run db:seed
```

## Builds

```bash
npm run build:changed      # which customers a change affects
npm run build:all          # queue an EAS build for every customer
```

CI does the same on push to `master`; see `.github/workflows/build.yml`.
