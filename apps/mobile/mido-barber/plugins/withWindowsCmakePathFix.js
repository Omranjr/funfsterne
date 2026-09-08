const { withAppBuildGradle } = require("expo/config-plugins");

/**
 * Expo config plugin: survive Windows' 260-character path limit during the
 * native CMake build.
 *
 * ## The problem
 *
 * CMake mirrors each source file's absolute path into the path of its object
 * file. In a hoisted npm monorepo the sources live several directories deep
 * under `apps/mobile/node_modules`, so a single object file lands at roughly:
 *
 *   <app>/android/app/.cxx/Debug/<hash>/<abi>/
 *     <target>_autolinked_build/CMakeFiles/react_codegen_<target>.dir/
 *     <mirrored absolute source path>/<File>.cpp.o
 *
 * For `react-native-safe-area-context` that measured 398 characters from the
 * repository's real location, and ninja fails hard on Windows with
 * `ninja: error: Filename longer than 260 characters`.
 *
 * Mapping the repo to a short drive letter (`subst M:`) removes ~108 of those
 * characters — the alias shortens both the build prefix and the mirrored
 * source path — but that still leaves ~287, which is over the limit.
 *
 * ## The fix
 *
 * `CMAKE_OBJECT_PATH_MAX` is CMake's own designed remedy. When a computed
 * object path would exceed it, CMake substitutes a short hashed directory
 * name for the mirrored source path instead. 240 leaves headroom under 260.
 *
 * This changes build layout only: no compiler flags, no ABI, no output
 * difference. It is a no-op on Linux and macOS, where the limit does not
 * exist — which is why it is safe to apply unconditionally rather than
 * gating on `process.platform` (the gate would then be evaluated on whatever
 * machine last ran prebuild, not the machine running the build).
 *
 * ## Why a plugin
 *
 * `android/app/build.gradle` is generated. Editing it directly works until
 * the next `npx expo prebuild --clean`, which silently discards the fix and
 * reintroduces a confusing failure. A plugin reapplies it every prebuild.
 */

/** Marker so a second prebuild does not insert the block twice. */
const MARKER = "CMAKE_OBJECT_PATH_MAX";

const BLOCK = `
        // Injected by plugins/withWindowsCmakePathFix.js -- do not edit here.
        // Windows ninja fails at 260 characters; CMake shortens object paths
        // that would exceed this. See the plugin for the full explanation.
        externalNativeBuild {
            cmake {
                arguments "-DCMAKE_OBJECT_PATH_MAX=240"
            }
        }
`;

/**
 * Inserts the block at the end of `defaultConfig { ... }`.
 *
 * Anchored on `buildConfigField "String", "REACT_NATIVE_RELEASE_LEVEL"`,
 * which React Native's template emits as the last line of that block. If a
 * future template changes it the plugin throws rather than silently doing
 * nothing — a build that fails at prebuild with a clear message is far
 * cheaper to diagnose than one that fails 20 minutes later inside ninja.
 */
function addCmakeArguments(contents) {
  if (contents.includes(MARKER)) return contents;

  const anchor = /(buildConfigField "String", "REACT_NATIVE_RELEASE_LEVEL"[^\n]*\n)/;
  if (!anchor.test(contents)) {
    throw new Error(
      "withWindowsCmakePathFix: could not find the end of defaultConfig in " +
        "android/app/build.gradle. The React Native template has changed; " +
        "update the anchor in plugins/withWindowsCmakePathFix.js.",
    );
  }

  return contents.replace(anchor, `$1${BLOCK}`);
}

module.exports = function withWindowsCmakePathFix(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== "groovy") {
      throw new Error(
        "withWindowsCmakePathFix: expected a Groovy build.gradle, got " +
          cfg.modResults.language,
      );
    }
    cfg.modResults.contents = addCmakeArguments(cfg.modResults.contents);
    return cfg;
  });
};
