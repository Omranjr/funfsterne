const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
// apps/mobile/<customer> -> repo root
const workspaceRoot = path.resolve(projectRoot, "../../..");

const config = getDefaultConfig(projectRoot);

// Watch the whole workspace, not a hand-picked list of directories.
//
// Two reasons, and the second one is not obvious:
//
//  1. Workspace packages are consumed as TypeScript source, not a build
//     artifact, so an edit in packages/core has to trigger a reload.
//
//  2. Metro only resolves files that are under the project root or inside a
//     watch folder -- a directory merely being in `nodeModulesPaths` is not
//     enough. Expo's monorepo detection watches the workspace ROOT's
//     node_modules, but npm hoists this workspace's dependencies to
//     apps/mobile/node_modules (a React 19 mobile app and a React 18
//     dashboard cannot share one hoisted react at the root). Everything
//     therefore lived in a directory Metro refused to read, and even
//     `expo-router/entry` failed to resolve.
//
// Watching the workspace root covers both, and keeps working whatever npm
// decides to hoist where after the next dependency change.
config.watchFolders = [workspaceRoot];

/**
 * Every node_modules directory between this app and the repo root.
 *
 * npm hoists a workspace dependency to the highest directory where nothing
 * conflicts. With a React 19 mobile app and a React 18 dashboard in the same
 * workspace, that lands react/react-native in `apps/mobile/node_modules` --
 * neither the app's own directory nor the repo root. Listing the whole chain
 * means this config does not have to predict which level npm chose.
 */
const nodeModulesChain = [];
for (
  let dir = projectRoot;
  dir.startsWith(workspaceRoot);
  dir = path.dirname(dir)
) {
  nodeModulesChain.push(path.join(dir, "node_modules"));
  if (dir === workspaceRoot) break;
}

config.resolver.nodeModulesPaths = nodeModulesChain;
config.resolver.disableHierarchicalLookup = false;

// Singleton packages whose module-scope state MUST be shared across the
// entire bundle. React's hook dispatcher is the prime example: if Metro
// loads two physical copies of react (even identical versions), hooks break
// with "Invalid hook call" / "Cannot read property 'useRef' of null".
//
// This matters more since the monorepo split: packages/core renders the
// components and this package hosts them, and `nativewind` ships its own
// nested copy of react and react-native, so without this a single bundle can
// genuinely end up with two of each.
const SINGLETONS = [
  "react",
  "react-native",
  "react-native-reanimated",
  "react-native-worklets",
];

/**
 * The one physical directory a singleton lives in.
 *
 * Resolved with Node's own algorithm from this app's directory rather than
 * by guessing at a node_modules path, so it is correct whatever npm decided
 * to hoist where.
 */
function singletonRoot(name) {
  try {
    // dirname twice: <root>/node_modules/<name>/package.json -> <root>/node_modules
    const pkg = require.resolve(`${name}/package.json`, {
      paths: [projectRoot],
    });
    return path.dirname(path.dirname(pkg));
  } catch {
    // Not installed (e.g. a customer app that has dropped one of these).
    // Returning null leaves the request to Metro's default resolver.
    return null;
  }
}

const SINGLETON_ROOTS = {};
for (const name of SINGLETONS) {
  const root = singletonRoot(name);
  if (root) SINGLETON_ROOTS[name] = root;
}

/**
 * Check whether a module request is for a singleton package or one of its
 * subpath exports (e.g. "react", "react/cjs/react.development.js",
 * "react/jsx-runtime", "react-native/Libraries/...").
 */
function getSingletonName(moduleName) {
  if (typeof moduleName !== "string") return null;
  for (const singleton of SINGLETONS) {
    if (moduleName === singleton || moduleName.startsWith(`${singleton}/`)) {
      return singleton;
    }
  }
  return null;
}

const originalResolveRequest = config.resolver.resolveRequest;

// Metro's default resolver is passed on the context when no custom
// resolveRequest was configured. Newer Expo SDKs no longer pre-populate
// config.resolver.resolveRequest, so we fall back to context.resolveRequest.
function resolveRequest(context, moduleName, platform) {
  const resolver =
    originalResolveRequest ??
    context.resolveRequest ??
    context._resolveRequest;
  if (typeof resolver !== "function") {
    throw new Error(
      `Could not find a Metro resolver. originalResolveRequest=${typeof originalResolveRequest}, ` +
        `context.resolveRequest=${typeof context.resolveRequest}`
    );
  }
  return resolver(context, moduleName, platform);
}

// Intercept Metro resolution for singletons and force them to resolve from
// the single physical copy. This covers bare imports AND subpath imports,
// regardless of which package initiated the import or how npm hoisted the
// dependency tree.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const singleton = getSingletonName(moduleName);
  const root = singleton ? SINGLETON_ROOTS[singleton] : null;

  if (root) {
    const singletonContext = {
      ...context,
      // Restrict resolution to one directory so the singleton can only be
      // found in one place.
      nodeModulesPaths: [root],
      // Make the request originate from inside the singleton package so
      // relative/subpath resolution starts at the correct root.
      originModulePath: path.join(root, singleton, "package.json"),
    };
    return resolveRequest(singletonContext, moduleName, platform);
  }

  return resolveRequest(context, moduleName, platform);
};

module.exports = config;
