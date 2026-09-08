#!/usr/bin/env node
/**
 * Fail if a brand value has crept back into packages/core.
 *
 * The whole white-label design rests on one invariant: nothing in
 * `packages/core` names a customer. That invariant is easy to state and easy
 * to break by accident -- a hex code pasted into a StyleSheet, an API URL
 * hardcoded "just for now", a support number in a fallback string. None of
 * those break a build or a test; they just quietly ship one customer's
 * details inside another customer's app.
 *
 * Run by CI (`npm run check:core`) and cheap enough to run by hand.
 *
 * This is a lint, not a proof: it catches the shapes that have actually gone
 * wrong before, and it will not catch a brand value that looks like ordinary
 * text. False positives are suppressed with an inline
 * `brand-free-ok: <reason>` comment on the same line, which is deliberately
 * annoying to type so that suppressing one is a decision, not a reflex.
 */

const fs = require("node:fs");
const path = require("node:path");

const CORE_SRC = path.resolve(__dirname, "..", "packages", "core", "src");
const SUPPRESS = "brand-free-ok:";

const RULES = [
  {
    name: "hardcoded colour",
    // Hex colours and rgb()/rgba() literals. Colours belong in a customer's
    // theme.ts, or in defaultTheme.ts / NEUTRAL_TOKENS as documented neutrals.
    re: /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3}(?:[0-9a-fA-F]{2})?)?\b|\brgba?\(\s*\d/g,
    // The theme directory is where neutral defaults legitimately live, and
    // colour.ts is colour maths.
    skipFiles: [
      "theme/defaultTheme.ts",
      "theme/color.ts",
      "theme/createThemes.ts",
    ],
  },
  {
    name: "hardcoded URL",
    re: /https?:\/\/(?!localhost)[^\s"'`)]+/g,
    // defaultConfig's localhost fallback is excluded by the negative
    // lookahead above; docs links in comments are not, on purpose.
    skipFiles: [],
  },
  {
    name: "brand name",
    // Not preceded by "@": `@funfsterne/shared-types` is the workspace's npm
    // scope -- the platform's name, which is allowed to appear in core --
    // whereas a bare "Fünf Sterne" is one customer's shop name, which is not.
    re: /(?<![@\w])f(?:ü|ue|u)nf[\s-]*sterne/gi,
    skipFiles: [],
  },
  {
    name: "phone number",
    re: /\+\d[\d\s().-]{7,}/g,
    skipFiles: [],
  },
  {
    name: "currency symbol literal",
    // The symbol is per-customer; core renders config.currencySymbol or a
    // {{symbol}} interpolation.
    //
    // "$" only counts when it is actually prefixing an amount: a bare "$" is
    // overwhelmingly a template-literal interpolation, and flagging every one
    // of those would make this check noise that people learn to ignore.
    re: /[€£¥₹]|\$(?=\s?\d)/g,
    skipFiles: ["types/config.ts", "config/defaultConfig.ts"],
  },
  {
    name: "email address",
    re: /[\w.+-]+@[\w-]+\.[\w.]+/g,
    skipFiles: [],
  },
];

/** Locale JSON is shared copy; brand copy is overridden per customer. */
const EXTENSIONS = new Set([".ts", ".tsx", ".json"]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (EXTENSIONS.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

let violations = 0;

for (const file of walk(CORE_SRC)) {
  const rel = path.relative(CORE_SRC, file).split(path.sep).join("/");
  const lines = fs.readFileSync(file, "utf8").split("\n");

  for (const rule of RULES) {
    if (rule.skipFiles.includes(rel)) continue;

    lines.forEach((line, i) => {
      if (line.includes(SUPPRESS)) return;
      rule.re.lastIndex = 0;
      const matches = line.match(rule.re);
      if (!matches) return;
      violations++;
      console.error(
        `packages/core/src/${rel}:${i + 1}  ${rule.name}: ${matches.join(", ")}`,
      );
      console.error(`    ${line.trim()}`);
    });
  }
}

if (violations > 0) {
  console.error(
    `\n${violations} brand value(s) found in packages/core.\n` +
      "Move them to the customer app's src/theme.ts, src/config.ts or\n" +
      "src/brand.ts, or -- if the value is genuinely brand-neutral -- add a\n" +
      `"// ${SUPPRESS} <reason>" comment on that line.\n`,
  );
  process.exit(1);
}

console.log("packages/core is brand-free.");
