import { sha256 } from "viem";
import type { UnsignedNostrEvent, HashedNostrEvent } from "../types/index.js";
import { serializeEvent } from "./serializeEvent.js";

/**
 * Compute the NIP-01 event hash (SHA-256 of the serialized event).
 * Returns a 64-char hex hash string without 0x prefix.
 */
export function hashEvent(event: UnsignedNostrEvent): string {
  const serialized = serializeEvent(event);
  const bytes = new TextEncoder().encode(serialized);
  const hash = sha256(bytes, "hex");
  // sha256 from viem returns 0x-prefixed
  return hash.startsWith("0x") ? hash.slice(2) : hash;
}

/**
 * Compute the hash and attach it as the event id.
 */
export function hashAndPrepare(event: UnsignedNostrEvent): HashedNostrEvent {
  return {
    ...event,
    id: hashEvent(event),
  };
}
