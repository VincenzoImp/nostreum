import type { Address } from "viem";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Format an Ethereum address as lowercase without 0x prefix (contract content format).
 */
export function addressToContent(address: string): string {
  return address.toLowerCase().replace(/^0x/, "");
}

/**
 * Check if a content string is a valid Ethereum address (40 hex chars, no prefix).
 */
export function isValidAddressContent(content: string): boolean {
  return /^[0-9a-f]{40}$/.test(content);
}

/**
 * Check if an address is the zero address (no link).
 */
export function isZeroAddress(address: Address): boolean {
  return address === ZERO_ADDRESS;
}
