import type { UnsignedNostrEvent } from "../types/index.js";

/**
 * Serialize a Nostr event to the NIP-01 canonical JSON format.
 * Produces: [0,"<pubkey>",<created_at>,<kind>,<tags>,"<content>"]
 *
 * This matches the on-chain serialization used in verifyNostrEvent exactly.
 */
export function serializeEvent(event: UnsignedNostrEvent): string {
  return JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);
}
