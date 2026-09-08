#!/usr/bin/env node
/**
 * Work out which customer apps a change actually affects.
 *
 * Prints a JSON array of customer slugs on stdout, so it can drive both a
 * local build and the CI matrix:
 *
 *   node scripts/build-changed.js                 # against HEAD~1
 *   node scripts/build-changed.js origin/main     # against a base ref
 *
 * The rule:
 *   - a change under packages/ or to a root config file touches shared code,
 *     so every customer is rebuilt;
 *   - otherwise only the customers whose own directory changed.
 *
 * Erring towards rebuilding everything is deliberate. A missed rebuild ships
 * a customer an app without a fix that is already live for everyone else,
 * and nobody finds out until that customer reports it; a redundant rebuild
 * costs one EAS job.
 */

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const mobileDir = path.join(repoRoot, "apps", "mobile");

/** Every real customer. The template is a scaffold, never built. */
function allCustomers() {
  if (!fs.existsSync(mobileDir)) return [];
  return fs
    .readdirSync(mobileDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== "template")
    .map((e) => e.name)
    .sort();
}

function changedFiles(base) {
  try {
    const out = execFileSync(
      "git",
      ["diff", "--name-only", `${base}...HEAD`],
      { cwd: repoRoot, encoding: "utf8" },
    );
    return out.split("\n").map((l) => l.trim()).filter(Boolean);
  } catch {
    // A shallow clone has no HEAD~1, and a first commit has no parent.
    // Falling back to "everything changed" keeps CI correct on the first run
    // of a new branch rather than silently building nothing.
    return null;
  }
}

// Paths that affect the bundle of every app.
const SHARED_PREFIXES = ["packages/"];
const SHARED_FILES = [
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "turbo.json",
];

function main() {
  const base = process.argv[2] || "HEAD~1";
  const customers = allCustomers();
  const changed = changedFiles(base);

  if (changed === null) {
    process.stdout.write(JSON.stringify(customers) + "\n");
    return;
  }

  const touchesShared = changed.some(
    (f) =>
      SHARED_PREFIXES.some((p) => f.startsWith(p)) || SHARED_FILES.includes(f),
  );

  if (touchesShared) {
    process.stdout.write(JSON.stringify(customers) + "\n");
    return;
  }

  const affected = new Set();
  for (const file of changed) {
    const parts = file.split("/");
    // apps/mobile/<slug>/...
    if (parts[0] === "apps" && parts[1] === "mobile" && parts[2]) {
      if (parts[2] !== "template" && customers.includes(parts[2])) {
        affected.add(parts[2]);
      }
    }
  }

  process.stdout.write(JSON.stringify([...affected].sort()) + "\n");
}

main();
