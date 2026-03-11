import type { Hash, Hex } from "viem";

const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";

/**
 * Convert a 64-char hex Nostr pubkey to a 0x-prefixed bytes32 for contract calls.
 */
export function pubkeyToBytes32(pubkey: string): Hash {
  const clean = pubkey.startsWith("0x") ? pubkey.slice(2) : pubkey;
  return `0x${clean}` as Hash;
}

/**
 * Convert a 0x-prefixed bytes32 from the contract to a 64-char hex Nostr pubkey.
 * Returns null if the value is the zero bytes32.
 */
export function bytes32ToPubkey(bytes32: Hash): string | null {
  if (bytes32 === ZERO_BYTES32) return null;
  return bytes32.startsWith("0x") ? bytes32.slice(2) : bytes32;
}

/**
 * Convert a 128-char hex Schnorr signature to a 0x-prefixed bytes value.
 */
export function sigToHex(sig: string): Hex {
  const clean = sig.startsWith("0x") ? sig : `0x${sig}`;
  return clean as Hex;
}

/** Check if a string is a valid 64-char hex Nostr pubkey. */
export function isValidPubkey(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

/** Check if a string is a valid 128-char hex Schnorr signature. */
export function isValidSchnorrSig(value: string): boolean {
  return /^[0-9a-f]{128}$/.test(value);
}
