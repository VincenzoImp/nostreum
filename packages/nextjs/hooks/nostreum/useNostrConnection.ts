import { useCallback, useEffect, useRef, useState } from "react";
import { verifyEvent } from "nostr-tools";
import { AuthorProfile, NostrEvent, RelayConnection } from "~~/types/nostreum";
import { notification } from "~~/utils/scaffold-eth/notification";

const DEFAULT_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.nostr.band",
  "wss://nostr-pub.wellorder.net",
];

const CONNECTION_TIMEOUT = 10000;
const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;
const MIN_RECONNECT_INTERVAL = 1000;

export const useNostrConnection = (messageFilter?: (event: NostrEvent) => boolean) => {
  const [events, setEvents] = useState<NostrEvent[]>([]);
  const [authors, setAuthors] = useState<Map<string, AuthorProfile>>(new Map());
  const [loading, setLoading] = useState(false);
  const [relay, setRelay] = useState<RelayConnection>({
    ws: null,
    url: "wss://relay.damus.io",
    connected: false,
    connecting: false,
    lastConnectAttempt: 0,
    reconnectAttempts: 0,
  });
  const [subscriptionActive, setSubscriptionActive] = useState(false);

  const relayRef = useRef<RelayConnection>(relay);
  const mountedRef = useRef(true);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectPromiseRef = useRef<Promise<void> | null>(null);
  const messageFilterRef = useRef(messageFilter);

  useEffect(() => {
    messageFilterRef.current = messageFilter;
  }, [messageFilter]);

  useEffect(() => {
    relayRef.current = relay;
  }, [relay]);

  const isValidEvent = useCallback((event: NostrEvent): boolean => {
    try {
      if (!event || !event.id || !event.pubkey || !event.sig) return false;
      if (typeof event.kind !== "number" || typeof event.created_at !== "number") return false;
      return verifyEvent(event);
    } catch {
      return false;
    }
  }, []);

  const handleTextNote = useCallback((event: NostrEvent) => {
    if (!mountedRef.current) return;
    setEvents(prev => {
      if (prev.some(e => e.id === event.id)) return prev;
      const newEvents = [...prev];
      const insertIdx = newEvents.findIndex(e => e.created_at < event.created_at);
      if (insertIdx === -1) {
        newEvents.push(event);
      } else {
        newEvents.splice(insertIdx, 0, event);
      }
      return newEvents;
    });
  }, []);

  const handleProfileMetadata = useCallback((event: NostrEvent) => {
    if (!mountedRef.current) return;
    try {
      const profileData = JSON.parse(event.content);
      setAuthors(prev => {
        const newAuthors = new Map(prev);
        const existing = newAuthors.get(event.pubkey) || { pubkey: event.pubkey, isFollowed: false };
        newAuthors.set(event.pubkey, {
          ...existing,
          name: profileData.name || profileData.display_name,
          about: profileData.about,
          picture: profileData.picture,
        });
        return newAuthors;
      });
    } catch (error) {
      console.error("Error parsing profile metadata:", error);
    }
  }, []);

  const handleRelayMessage = useCallback(
    (message: any[]) => {
      if (!mountedRef.current) return;
      const [type, subscriptionId, event] = message;
      if (type === "EVENT") {
        if (!isValidEvent(event)) {
          console.warn("Rejected invalid event:", event?.id?.slice(0, 16));
          return;
        }
        if (event.kind === 1) {
          const filter = messageFilterRef.current;
          if (!filter || filter(event)) {
            handleTextNote(event);
          }
        } else if (event.kind === 0) {
          handleProfileMetadata(event);
        }
      } else if (type === "EOSE") {
        console.log(`End of stored events for subscription: ${subscriptionId}`);
        setLoading(false);
      }
    },
    [handleTextNote, handleProfileMetadata, isValidEvent],
  );

  const cleanupConnection = useCallback(() => {
    if (relayRef.current.ws) {
      const ws = relayRef.current.ws;
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    connectPromiseRef.current = null;
  }, []);

  const connectToRelay = useCallback(
    async (relayUrl: string, isReconnect: boolean = false) => {
      if (!mountedRef.current) return;
      if (connectPromiseRef.current) return connectPromiseRef.current;

      const now = Date.now();
      if (now - relayRef.current.lastConnectAttempt < MIN_RECONNECT_INTERVAL) return;
      if (relayRef.current.connected && relayRef.current.url === relayUrl) return;

      const connectPromise = new Promise<void>((resolve, reject) => {
        if (!mountedRef.current) {
          reject(new Error("Component unmounted"));
          return;
        }

        cleanupConnection();

        setRelay(prev => ({
          ...prev,
          connecting: true,
          lastConnectAttempt: now,
          reconnectAttempts: isReconnect ? prev.reconnectAttempts + 1 : 0,
        }));

        if (!isReconnect) setLoading(true);

        try {
          const ws = new WebSocket(relayUrl);

          const connectionTimeout = setTimeout(() => {
            if (!mountedRef.current) return;
            if (ws.readyState === WebSocket.CONNECTING) {
              ws.close();
              reject(new Error("Connection timeout"));
            }
          }, CONNECTION_TIMEOUT);

          ws.onopen = () => {
            if (!mountedRef.current) {
              ws.close();
              reject(new Error("Component unmounted during connection"));
              return;
            }
            clearTimeout(connectionTimeout);
            setRelay(prev => ({
              ...prev,
              ws,
              url: relayUrl,
              connected: true,
              connecting: false,
              reconnectAttempts: 0,
            }));
            if (!isReconnect) notification.success(`Connected to ${relayUrl}`);
            resolve();
          };

          ws.onmessage = wsEvent => {
            if (!mountedRef.current) return;
            try {
              const message = JSON.parse(wsEvent.data);
              handleRelayMessage(message);
            } catch (error) {
              console.error("Error parsing relay message:", error);
            }
          };

          ws.onerror = error => {
            clearTimeout(connectionTimeout);
            console.error("WebSocket error:", error);
            if (!mountedRef.current) {
              reject(new Error("Component unmounted"));
              return;
            }
            if (!isReconnect) notification.error(`Failed to connect to relay: ${relayUrl}`);
            reject(error);
          };

          ws.onclose = closeEvent => {
            clearTimeout(connectionTimeout);
            if (!mountedRef.current) {
              reject(new Error("Component unmounted"));
              return;
            }
            setRelay(prev => ({ ...prev, ws: null, connected: false, connecting: false }));
            setSubscriptionActive(false);

            if (closeEvent.code !== 1000 && closeEvent.code !== 1001 && mountedRef.current) {
              const currentRelay = relayRef.current;
              if (currentRelay.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectTimeoutRef.current = setTimeout(() => {
                  if (mountedRef.current) {
                    connectToRelay(relayUrl, true).catch(err => console.error("Reconnection failed:", err));
                  }
                }, RECONNECT_DELAY);
              } else {
                if (mountedRef.current) notification.error("Connection lost. Please try connecting manually.");
              }
            }
            if (!isReconnect) reject(new Error("Connection closed"));
          };
        } catch (error) {
          console.error("Error creating WebSocket:", error);
          if (mountedRef.current) setRelay(prev => ({ ...prev, connecting: false }));
          reject(error);
        } finally {
          if (!isReconnect && mountedRef.current) setLoading(false);
        }
      });

      connectPromiseRef.current = connectPromise;
      try {
        await connectPromise;
      } catch (error) {
        if (mountedRef.current) console.error("Connection failed:", error);
      } finally {
        connectPromiseRef.current = null;
      }
    },
    [cleanupConnection, handleRelayMessage],
  );

  useEffect(() => {
    mountedRef.current = true;
    connectToRelay(DEFAULT_RELAYS[0]);
    return () => {
      mountedRef.current = false;
      cleanupConnection();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    events,
    setEvents,
    authors,
    setAuthors,
    loading,
    setLoading,
    relay,
    subscriptionActive,
    setSubscriptionActive,
    connectToRelay,
    handleRelayMessage,
    cleanupConnection,
    DEFAULT_RELAYS,
    MAX_RECONNECT_ATTEMPTS,
  };
};
