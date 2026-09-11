import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PKPass } from "passkit-generator";

/**
 * Builds the signed Apple Wallet pass carrying a customer's loyalty QR code.
 *
 * The point of the feature is that a scan after the cut costs a double-tap of
 * the side button instead of unlock -> find app -> wait for a cold backend ->
 * navigate to the loyalty tab.
 *
 * This is deliberately a *static* pass: it carries the QR and nothing that goes
 * out of date. Showing a points balance would mean implementing Apple's PassKit
 * Web Service -- device registration, four REST endpoints, and an APNs push on
 * every points change -- which on the current Render plan would spend most of
 * its time timing out against a cold start. The back of the pass points at the
 * app for the balance instead, which is where customers look anyway.
 *
 * That it *can* be static at all is a property of this codebase specifically:
 * the QR payload is `funfsterne:loyalty:<ConsumerUser.id>`, derived from the
 * account id, so it is stable for the life of the account. A rotating code
 * could not be mirrored into Wallet without the update service.
 */

const ASSET_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "assets",
  "pass",
);

/** Matches the prefix the admin scanner validates before calling /loyalty/scan. */
const QR_PREFIX = "funfsterne:loyalty:";

/** Files Apple requires in the bundle, plus the strip that carries the design. */
const ASSET_FILES = [
  "icon.png",
  "icon@2x.png",
  "icon@3x.png",
  "strip.png",
  "strip@2x.png",
  "strip@3x.png",
] as const;

export type WalletPassConfigError =
  | "NOT_CONFIGURED"
  | "INVALID_CERTIFICATES";

export type BuildPassResult =
  | { ok: true; buffer: Buffer }
  | { ok: false; errorCode: WalletPassConfigError; detail: string };

interface WalletPassEnv {
  passTypeIdentifier: string;
  teamIdentifier: string;
  signerCert: Buffer;
  signerKey: Buffer;
  signerKeyPassphrase?: string;
  wwdr: Buffer;
}

/**
 * Accepts either base64 or a raw PEM block.
 *
 * Render's dashboard does accept multi-line values, but a PEM pasted into a
 * web form is one stray whitespace change away from an opaque signing failure.
 * Base64 survives that, so it is what the setup notes recommend -- while a
 * literal PEM still works for anyone who prefers it, and for local .env files.
 */
function decodePem(value: string): Buffer {
  const trimmed = value.trim();
  if (trimmed.includes("-----BEGIN")) {
    return Buffer.from(trimmed, "utf8");
  }
  return Buffer.from(trimmed, "base64");
}

/**
 * Reads the signing material. Returns null when the feature simply has not been
 * configured, which is the normal state before the Apple Developer steps are
 * done and must not be treated as an error.
 */
function readEnv(): WalletPassEnv | null {
  const passTypeIdentifier = process.env.WALLET_PASS_TYPE_IDENTIFIER;
  const teamIdentifier = process.env.WALLET_PASS_TEAM_IDENTIFIER;
  const signerCert = process.env.WALLET_PASS_SIGNER_CERT;
  const signerKey = process.env.WALLET_PASS_SIGNER_KEY;
  const wwdr = process.env.WALLET_PASS_WWDR_CERT;

  if (
    !passTypeIdentifier ||
    !teamIdentifier ||
    !signerCert ||
    !signerKey ||
    !wwdr
  ) {
    return null;
  }

  return {
    passTypeIdentifier,
    teamIdentifier,
    signerCert: decodePem(signerCert),
    signerKey: decodePem(signerKey),
    signerKeyPassphrase: process.env.WALLET_PASS_SIGNER_KEY_PASSPHRASE,
    wwdr: decodePem(wwdr),
  };
}

export function isWalletPassConfigured(): boolean {
  return readEnv() !== null;
}

/** Cached because the assets never change between requests. */
let assetCache: Record<string, Buffer> | null = null;

async function loadAssets(): Promise<Record<string, Buffer>> {
  if (assetCache) return assetCache;

  const entries = await Promise.all(
    ASSET_FILES.map(
      async (name) => [name, await readFile(path.join(ASSET_DIR, name))] as const,
    ),
  );

  assetCache = Object.fromEntries(entries);
  return assetCache;
}

export interface WalletPassCustomer {
  id: string;
  firstName: string;
  lastName: string;
}

/**
 * German only, by decision -- the shop is in Goch and its customers are local.
 * Apple localises passes by shipping .lproj folders, so adding English or
 * Arabic later is additive and does not change any of the code below.
 */
function buildPassJson(
  env: WalletPassEnv,
  customer: WalletPassCustomer,
): Record<string, unknown> {
  const displayName = `${customer.firstName} ${customer.lastName.charAt(0)}.`;

  return {
    formatVersion: 1,
    passTypeIdentifier: env.passTypeIdentifier,
    teamIdentifier: env.teamIdentifier,
    serialNumber: customer.id,
    organizationName: "Fünf Sterne Friseur",
    description: "Fünf Sterne Friseur Treuekarte",

    // Rendered live by iOS in the system font rather than shipped as artwork.
    // A wordmark image would be a 160x50pt slice of a JPEG and could never look
    // as clean as text that iOS draws at whatever size it needs.
    logoText: "Fünf Sterne",

    foregroundColor: "rgb(245, 240, 230)",
    backgroundColor: "rgb(13, 13, 12)",
    labelColor: "rgb(201, 168, 76)",

    // The pass carries an identifier tied to a real account. Nothing here is
    // worth stealing -- points land on the owner's account, not the thief's --
    // but someone holding a copy could burn the owner's once-per-day earn
    // before they reach the till. Blocking AirDrop costs nothing and removes
    // the casual version of that.
    sharingProhibited: true,

    storeCard: {
      // The only field visible while the pass is stacked in Wallet. It says
      // MITGLIED and nothing else: the customer's name belongs on the card
      // once, and repeating it here made the open card look like it had a
      // rendering fault.
      headerFields: [{ key: "membership", value: "MITGLIED" }],
      primaryFields: [
        { key: "member", label: "TREUEKARTE", value: displayName },
      ],
      secondaryFields: [],
      auxiliaryFields: [],
      backFields: [
        {
          key: "points",
          label: "Punktestand",
          value: "Öffne die App für deinen aktuellen Punktestand.",
        },
        {
          key: "howto",
          label: "So funktioniert's",
          value: "Zeige diesen Code nach deinem Termin an der Kasse vor.",
        },
        {
          key: "address",
          label: "Adresse",
          value: "Frauenstraße 5, 47574 Goch",
        },
        { key: "phone", label: "Telefon", value: "+49 2823 4198333" },
      ],
    },

    // Wallet renders the barcode itself from this string, so it is always
    // crisp and always matches what the admin scanner expects. We never ship
    // a QR image.
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: `${QR_PREFIX}${customer.id}`,
        messageEncoding: "iso-8859-1",
        altText: displayName,
      },
    ],
  };
}

export async function buildWalletPass(
  customer: WalletPassCustomer,
): Promise<BuildPassResult> {
  const env = readEnv();
  if (!env) {
    return {
      ok: false,
      errorCode: "NOT_CONFIGURED",
      detail:
        "Wallet pass signing is not configured. Set WALLET_PASS_TYPE_IDENTIFIER, " +
        "WALLET_PASS_TEAM_IDENTIFIER, WALLET_PASS_SIGNER_CERT, " +
        "WALLET_PASS_SIGNER_KEY and WALLET_PASS_WWDR_CERT.",
    };
  }

  const assets = await loadAssets();
  const passJson = buildPassJson(env, customer);

  try {
    const pass = new PKPass(
      {
        ...assets,
        "pass.json": Buffer.from(JSON.stringify(passJson), "utf8"),
      },
      {
        wwdr: env.wwdr,
        signerCert: env.signerCert,
        signerKey: env.signerKey,
        ...(env.signerKeyPassphrase
          ? { signerKeyPassphrase: env.signerKeyPassphrase }
          : {}),
      },
    );

    return { ok: true, buffer: pass.getAsBuffer() };
  } catch (error) {
    // Signing failures are almost always a certificate problem: an expired
    // Pass Type certificate, the wrong WWDR generation, or a key whose
    // passphrase does not match. They are reported separately from
    // NOT_CONFIGURED because the fix is completely different.
    return {
      ok: false,
      errorCode: "INVALID_CERTIFICATES",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}
