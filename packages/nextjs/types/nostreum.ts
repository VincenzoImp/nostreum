/**
 * Nostr Event Interface
 * Represents a Nostr event according to NIP-01 specification
 */
export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

/**
 * Author Profile Interface
 * Contains author information and Ethereum link status
 */
export interface AuthorProfile {
  pubkey: string;
  name?: string;
  about?: string;
  picture?: string;
  ethereumAddress?: string;
  isFollowed: boolean;
}

/**
 * WebSocket Connection Interface
 * Manages connection to Nostr relays
 */
export interface RelayConnection {
  ws: WebSocket | null;
  url: string;
  connected: boolean;
  connecting: boolean;
  lastConnectAttempt: number;
  reconnectAttempts: number;
}
