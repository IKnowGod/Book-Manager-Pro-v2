/**
 * ID Encoder/Decoder Utility
 * Converts integer database IDs to/from obfuscated base-36 strings
 * for friendlier, non-sequential URL parameters.
 */

const OFFSET = 1_000_000;

export function encodeId(id: number): string {
  return (id + OFFSET).toString(36).toUpperCase();
}

export function decodeId(encoded: string): number {
  const decoded = parseInt(encoded, 36);
  if (isNaN(decoded) || decoded < OFFSET) {
    throw new Error(`Invalid encoded ID: "${encoded}"`);
  }
  return decoded - OFFSET;
}
