# funfsterne

A Turborepo monorepo for the FünfSterne project, managed with npm workspaces.

## Structure

```
funfsterne/
├── apps/
│   ├── mobile/      # Mobile app (React Native / Expo)
│   ├── admin/       # Admin dashboard (Next.js / web)
│   └── api/         # Backend API
├── packages/
│   └── shared-types/# Shared TypeScript types and schemas
├── package.json     # Workspace root
├── turbo.json       # Turborepo pipeline configuration
└── README.md        # This file
```

## Getting Started

Install dependencies from the workspace root:

```bash
npm install
```

## Running Apps

Use Turborepo to run scripts across workspaces.

### Development

Start all apps in development mode:

```bash
npm run dev
```

Or run a specific app:

```bash
npm run dev -- --filter=mobile
npm run dev -- --filter=admin
npm run dev -- --filter=api
```

### Build

Build all apps and packages:

```bash
npm run build
```

Build a specific app:

```bash
npm run build -- --filter=admin
```

### Lint / Typecheck / Test

```bash
npm run lint
npm run typecheck
npm run test
```

## Workspaces

- `apps/mobile` — empty placeholder for the mobile application.
- `apps/admin` — empty placeholder for the admin web application.
- `apps/api` — empty placeholder for the backend API.
- `packages/shared-types` — empty placeholder for shared TypeScript types.

Each workspace will get its own `package.json` and tooling when it is scaffolded.
