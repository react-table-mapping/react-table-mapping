/**
 * Generates a unique id for a field or mapping that was created without one.
 *
 * Uses `crypto.randomUUID()` where the browser offers it. That API is restricted to secure
 * contexts, so it is simply absent when a page is served over plain http — a dev server
 * reached by LAN address, for one. The fallback covers that case and still produces a
 * UUID v4 shaped string, so ids look the same wherever they were made.
 */
export function createId(): string {
  const webCrypto = globalThis.crypto as Crypto | undefined;

  if (typeof webCrypto?.randomUUID === 'function') return webCrypto.randomUUID();

  const bytes = new Uint8Array(16);

  if (typeof webCrypto?.getRandomValues === 'function') {
    webCrypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }

  // Version 4 in the high nibble of byte 6; RFC 4122 variant in the top bits of byte 8.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
