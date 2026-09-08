# Notes on this app's `tsconfig.json`

**The `"*"` path mapping.** npm hoists this workspace's dependencies to
`apps/mobile/node_modules`, because a React 19 mobile app and a React 18
dashboard cannot share one hoisted `react` at the repo root. TypeScript
resolves bare specifiers relative to the *importing* file, so a file in
`packages/core/src` looks in `packages/node_modules` and the repo root and
finds neither `react-native` nor `expo`. The wildcard gives TypeScript the
same node_modules chain Metro walks (see `metro.config.js`).

**Why `packages/core` is in `include` rather than a project reference.**
`@funfsterne/core` ships TypeScript source with no build step, so this app's
typecheck is what checks it. Every customer app does the same, which means
core is verified against each consumer's own dependency versions rather than
against one canonical set.
