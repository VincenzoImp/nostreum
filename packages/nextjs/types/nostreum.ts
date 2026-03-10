export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export interface AuthorProfile {
  pubkey: string;
  name?: string;
  about?: string;
  picture?: string;
  ethereumAddress?: string;
  isFollowed: boolean;
}

export interface RelayConnection {
  ws: WebSocket | null;
  url: string;
  connected: boolean;
  connecting: boolean;
  lastConnectAttempt: number;
  reconnectAttempts: number;
}

declare global {
  interface Window {
    nostr?: {
      getPublicKey: () => Promise<string>;
      signEvent: (event: any) => Promise<any>;
    };
  }
}
