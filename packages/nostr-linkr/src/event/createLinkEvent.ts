import type { UnsignedNostrEvent } from "../types/index.js";
import { NOSTR_LINKR_EVENT_KIND } from "../constants/index.js";

/**
 * Create an unsigned Nostr linking event for the given Ethereum address and pubkey.
 *
 * @param ethereumAddress - The Ethereum address to embed (with or without 0x prefix)
 * @param nostrPubkey - The signer's Nostr pubkey (64-char hex)
 * @param timestamp - Optional Unix timestamp in seconds; defaults to current time
 */
export function createLinkEvent(
  ethereumAddress: string,
  nostrPubkey: string,
  timestamp?: number,
): UnsignedNostrEvent {
  const content = ethereumAddress.toLowerCase().replace(/^0x/, "");

  return {
    pubkey: nostrPubkey,
    created_at: timestamp ?? Math.floor(Date.now() / 1000),
    kind: NOSTR_LINKR_EVENT_KIND,
    tags: [],
    content,
  };
}
