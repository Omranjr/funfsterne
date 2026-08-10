import { NextResponse } from "next/server";

// Links this domain to the mobile app so iOS will treat credentials
// entered in the app as belonging to this domain -- required for the
// native "Save Password?" prompt to appear for a user-typed (not
// iOS-generated) password in a sign-up form outside Safari. Apple's CDN
// fetches this file directly from the domain named in the app's
// `associatedDomains` entitlement (apps/mobile/app.json), so it must be
// served at exactly this path with no file extension.
const TEAM_ID = "54Y3JG33LJ";
const BUNDLE_ID = "com.funfsterne.mobile";

export function GET() {
  return NextResponse.json({
    webcredentials: {
      apps: [`${TEAM_ID}.${BUNDLE_ID}`],
    },
  });
}
