const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [
  ...(config.watchFolders || []),
  path.resolve(workspaceRoot, "packages/shared-types"),
];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = false;

// Singleton packages whose module-scope state MUST be shared across the
// entire bundle. React's hook dispatcher is the prime example: if Metro
// loads two physical copies of react (even identical versions), hooks break
// with "Invalid hook call" / "Cannot read property 'useRef' of null".
const SINGLETONS = [
  "react",
  "react-native",
  "react-native-reanimated",
  "react-native-worklets",
];

const appNodeModules = path.resolve(projectRoot, "node_modules");

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
// the single physical copy in apps/mobile/node_modules. This covers bare
// imports AND subpath imports, regardless of which package initiated the
// import or how npm hoisted the dependency tree.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const singleton = getSingletonName(moduleName);
  if (singleton) {
    const singletonContext = {
      ...context,
      // Restrict resolution to the app node_modules so the singleton can
      // only be found in one place.
      nodeModulesPaths: [appNodeModules],
      // Make the request originate from inside the singleton package so
      // relative/subpath resolution starts at the correct root.
      originModulePath: path.join(appNodeModules, singleton, "package.json"),
    };
    return resolveRequest(singletonContext, moduleName, platform);
  }

  return resolveRequest(context, moduleName, platform);
};

module.exports = config;

