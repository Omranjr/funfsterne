# @funfsterne/core

Every screen, component, hook and API call that is the same for every
white-label customer.

## The one rule

**Nothing in `src/` may name a customer.** No brand colour, no shop name, no
API origin, no support number, no logo. `npm run check:core` fails the build
if one appears, and it runs in CI before anything is built.

Brand values reach this package three ways:

| Need | How |
|---|---|
| colours, spacing, radii | `useTheme()` |
| name, currency, contact details, feature switches | `useConfig()` |
| logo, hero image | `useBrandAssets()` |

Outside React — the API client, the storage-key helpers — use
`getConfig()` / `getThemes()` from `src/brand/registry.ts`.

## Consumed as source

There is no build step: `main` points at `src/index.ts` and each app's Metro
and TypeScript config compile these files directly. That is why this package
declares no dependencies beyond `@funfsterne/shared-types` — everything else
comes from whichever app is bundling it. See `metro.config.js` and
`tsconfig.README.md` in any customer app for the resolution details.

It also means there is no standalone `typecheck` script here: each app's
typecheck covers this package, against that app's own dependency versions.

## Every brand read is lazy

ES module imports are hoisted, so this package's modules are evaluated
*before* the app entry point calls `configureBrand`. A module-scope
`getConfig()` would therefore bake in the placeholder tenant. Anything that
reads the brand is a function called at request or render time — including
the storage keys, which look like constants but are not:

```ts
const themeStorageKey = () => storageKey("theme-mode");   // not a const
```

## Layout

```
src/
├── api/          client.ts (fetch + x-tenant-id), token-store.ts
├── brand/        registry.ts — the configureBrand seam
├── components/   21 shared components
├── config/       ConfigContext, defaultConfig
├── hooks/        queries, notifications, fonts, a11y
├── i18n/         i18next setup + en/de/ar bundles
├── navigation/   RootLayout + createAppRoot
├── screens/      9 screens, one per route
├── stores/       AuthContext, query client, persister
├── theme/        types, defaults, derivation, context, scales
├── types/        AppConfig
└── utils/        device id, price formatting, logging
```
