#!/usr/bin/env bash
#
# Scaffold a new white-label customer app.
#
# Usage: ./scripts/new-customer.sh <slug> "<App Name>"
# Example: ./scripts/new-customer.sh marco-salon "Marco's Salon"
#
# Creates apps/mobile/<slug> from the template, substitutes the slug and the
# app name, and prints the SQL that creates the matching Tenant row. It does
# NOT touch the database itself: the connection string is a production
# credential and this script should be runnable by anyone on the team.

set -euo pipefail

SLUG="${1:-}"
NAME="${2:-}"

if [ -z "$SLUG" ] || [ -z "$NAME" ]; then
  echo "Usage: ./scripts/new-customer.sh <slug> \"<App Name>\"" >&2
  echo "Example: ./scripts/new-customer.sh marco-salon \"Marco's Salon\"" >&2
  exit 1
fi

# The slug becomes a URL scheme, a package-name segment, a database lookup
# key and a storage prefix. Validating it here is cheaper than discovering
# at `eas build` time that "Marco's Salon" is not a valid Android package.
if ! printf '%s' "$SLUG" | grep -Eq '^[a-z][a-z0-9-]{1,38}[a-z0-9]$'; then
  echo "Error: slug must be lowercase letters, digits and hyphens, starting" >&2
  echo "       with a letter and ending alphanumeric (e.g. marco-salon)." >&2
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE="$REPO_ROOT/apps/mobile/template"
TARGET="$REPO_ROOT/apps/mobile/$SLUG"

if [ ! -d "$TEMPLATE" ]; then
  echo "Error: template not found at $TEMPLATE" >&2
  exit 1
fi

if [ -e "$TARGET" ]; then
  echo "Error: apps/mobile/$SLUG already exists. Refusing to overwrite." >&2
  exit 1
fi

echo "Creating new customer: $NAME ($SLUG)"

cp -r "$TEMPLATE" "$TARGET"
# node_modules may exist inside the template after an install at the repo
# root; copying it would produce a broken, half-hoisted tree.
rm -rf "$TARGET/node_modules"

# Android package segments cannot contain a hyphen.
PKG_SEGMENT="$(printf '%s' "$SLUG" | tr -d '-')"

# The app name goes into JSON and into a TypeScript string literal, so a
# customer called "Marco's Salon" needs its quote escaped in both.
ESCAPED_NAME_JSON="$(printf '%s' "$NAME" | sed 's/\\/\\\\/g; s/"/\\"/g')"

subst() {
  local file="$1"
  [ -f "$file" ] || return 0
  # A temp file rather than `sed -i`, whose in-place flag differs between
  # GNU and BSD sed and silently creates backup files on macOS.
  sed -e "s|CUSTOMER_SLUG|$SLUG|g" \
      -e "s|APP_NAME|$ESCAPED_NAME_JSON|g" \
      -e "s|com\.template|com.$PKG_SEGMENT|g" \
      "$file" > "$file.tmp"
  mv "$file.tmp" "$file"
}

subst "$TARGET/src/config.ts"
subst "$TARGET/app.json"
subst "$TARGET/package.json"

# The workspace package name is derived from the slug rather than
# substituted, because the template's own name is a valid package name and
# there is no placeholder in it to replace.
node -e '
  const fs = require("fs");
  const p = process.argv[1] + "/package.json";
  const pkg = JSON.parse(fs.readFileSync(p, "utf8"));
  pkg.name = "@funfsterne/" + process.argv[2];
  fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + "\n");
' "$TARGET" "$SLUG"

cat <<SQL > "$TARGET/tenant.sql"
-- Creates the Tenant row this app authenticates against. Run it against the
-- production database before the first build; until it exists, every request
-- from this app answers 404 TENANT_NOT_FOUND.
INSERT INTO public."Tenant" (id, slug, name, plan, "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, '$SLUG', '$(printf '%s' "$NAME" | sed "s/'/''/g")', 'BASIC', true, NOW(), NOW());

-- And the shop's first dashboard login. Replace the bcrypt hash: generate one
-- with  node -e "console.log(require('bcryptjs').hashSync('THE_PASSWORD', 10))"
-- INSERT INTO public."AdminUser" (id, "tenantId", email, "passwordHash", name, "createdAt", "updatedAt")
-- SELECT gen_random_uuid()::text, id, 'owner@example.com', '<bcrypt-hash>', '$ESCAPED_NAME_JSON', NOW(), NOW()
-- FROM public."Tenant" WHERE slug = '$SLUG';
SQL

echo ""
echo "Customer created at apps/mobile/$SLUG"
echo ""
echo "Next steps:"
echo "  1. Run the SQL in apps/mobile/$SLUG/tenant.sql against the database."
echo "  2. Replace the placeholder artwork in apps/mobile/$SLUG/assets/"
echo "     (see the README in that folder for the five files and their sizes)."
echo "  3. Fill in the TODOs in apps/mobile/$SLUG/src/theme.ts."
echo "  4. Fill in the TODOs in apps/mobile/$SLUG/src/config.ts and"
echo "     src/brand.ts (tagline, support phone, Instagram, privacy URL)."
echo "  5. Add the dashboard origin to ALLOWED_ORIGINS on the API."
echo "  6. npm install    # links the new workspace"
echo "  7. npm run typecheck --workspace=@funfsterne/$SLUG"
echo "  8. cd apps/mobile/$SLUG && eas init && eas build --platform all"
echo ""
echo "Note: app.json has no EAS projectId yet -- 'eas init' writes it."
