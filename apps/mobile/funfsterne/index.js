// Entry point.
//
// A local file rather than `"main": "expo-router/entry"` directly. npm hoists
// expo-router to apps/mobile/node_modules -- above this app's Metro project
// root but below the workspace server root -- and from there Metro computes a
// relative entry path that escapes the project root and fails to resolve
// ("Unable to resolve module ./apps/mobile/node_modules/expo-router/entry.js").
//
// Re-exporting it from inside the project root keeps the entry local and lets
// the import go through ordinary module resolution, which the resolver in
// metro.config.js already handles.
import "expo-router/entry";
