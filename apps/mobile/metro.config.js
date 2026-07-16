const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Monorepo workspace support: watch shared packages outside the app folder
const monorepoPackages = [
  path.resolve(__dirname, "../../packages/shared-types"),
];

config.watchFolders = [...(config.watchFolders || []), ...monorepoPackages];

// Ensure Metro resolves workspace symlinks / hoisted packages correctly
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(__dirname, "../../node_modules"),
];

config.resolver.disableHierarchicalLookup = false;

module.exports = config;
