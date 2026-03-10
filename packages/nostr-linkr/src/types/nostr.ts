/** A raw Nostr event as defined by NIP-01. */
export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

/** An unsigned Nostr event before hashing and signing. */
export interface UnsignedNostrEvent {
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
}

/** An unsigned event with its computed id, ready for signing. */
export interface HashedNostrEvent extends UnsignedNostrEvent {
  id: string;
}

/** A NIP-07 compatible signer (browser extension interface). */
export interface NostrSigner {
  getPublicKey: () => Promise<string>;
  signEvent: (event: HashedNostrEvent) => Promise<NostrEvent>;
}

/** Nostr profile metadata (kind:0 content parsed). */
export interface NostrProfile {
  name?: string;
  display_name?: string;
  about?: string;
  picture?: string;
  nip05?: string;
  banner?: string;
  lud16?: string;
  website?: string;
}
