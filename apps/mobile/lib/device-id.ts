import * as SecureStore from "expo-secure-store";

const DEVICE_ID_KEY = "funfsterne_device_id";

/**
 * Generates a RFC 4122 v4 UUID using `crypto.getRandomValues` when available
 * (Hermes on modern Expo SDKs exposes it via `globalThis.crypto`). Falls back
 * to `Math.random` for older runtimes; the value is not used for any
 * security-sensitive purpose — it only identifies the device to the backend
 * so a single physical device cannot redeem the same code twice.
 */
function generateUuidV4(): string {
  const cryptoObj: Crypto | undefined =
    typeof globalThis !== "undefined" && "crypto" in globalThis
      ? (globalThis.crypto as Crypto | undefined)
      : undefined;

  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    cryptoObj.getRandomValues(bytes);
    // Per RFC 4122 §4.4: set version (4) and variant (10) bits.
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
    return (
      hex.slice(0, 4).join("") +
      "-" +
      hex.slice(4, 6).join("") +
      "-" +
      hex.slice(6, 8).join("") +
      "-" +
      hex.slice(8, 10).join("") +
      "-" +
      hex.slice(10, 16).join("")
    );
  }

  // Fallback — not cryptographically strong, but sufficient as a stable
  // per-install identifier.
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  const r = (n: number) => Math.floor(Math.random() * n);
  const bytes = Array.from({ length: 16 }, () => r(256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return (
    hex(bytes[0]) +
    hex(bytes[1]) +
    hex(bytes[2]) +
    hex(bytes[3]) +
    "-" +
    hex(bytes[4]) +
    hex(bytes[5]) +
    "-" +
    hex(bytes[6]) +
    hex(bytes[7]) +
    "-" +
    hex(bytes[8]) +
    hex(bytes[9]) +
    "-" +
    hex(bytes[10]) +
    hex(bytes[11]) +
    hex(bytes[12]) +
    hex(bytes[13]) +
    hex(bytes[14]) +
    hex(bytes[15])
  );
}

/**
 * Returns the persistent device identifier used by the accountless discount
 * flow. The value is created on first call and stored in expo-secure-store so
 * it survives app restarts and is stable across reinstalls only when the OS
 * preserves the keystore. The value is NOT a user account and contains no PII.
 *
 * Concurrent first calls (e.g. on a cold start with multiple consumers) are
 * serialised by an in-process promise; the SecureStore write is idempotent.
 */
let inflight: Promise<string> | null = null;

export async function getOrCreateDeviceId(): Promise<string> {
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
      if (existing && existing.length > 0) {
        return existing;
      }
    } catch {
      // SecureStore can throw on simulators with no keystore set up;
      // fall through to generating a fresh id and best-effort persist.
    }

    const fresh = generateUuidV4();

    try {
      await SecureStore.setItemAsync(DEVICE_ID_KEY, fresh);
    } catch {
      // If persist fails, still return the in-memory value for this session.
    }

    return fresh;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}
