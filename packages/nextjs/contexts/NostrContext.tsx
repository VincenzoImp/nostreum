"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { verifyEvent } from "nostr-tools";
import type { ConnectionStatus, NostrEvent, NostrFilter } from "~~/types/nostr";

const DEFAULT_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.nostr.band",
  "wss://nostr-pub.wellorder.net",
];

const CONNECTION_TIMEOUT = 10000;
const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;

interface Subscription {
  id: string;
  filters: NostrFilter[];
  onEvent: (event: NostrEvent) => void;
  onEose?: () => void;
}

interface NostrContextValue {
  status: ConnectionStatus;
  activeRelay: string;
  reconnectAttempts: number;
  subscribe: (
    id: string,
    filters: NostrFilter[],
    onEvent: (event: NostrEvent) => void,
    onEose?: () => void,
  ) => () => void;
  publish: (event: NostrEvent) => Promise<boolean>;
  ws: WebSocket | null;
}

const NostrContext = createContext<NostrContextValue | null>(null);

export function NostrProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [activeRelay, setActiveRelay] = useState(DEFAULT_RELAYS[0]);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(true);
  const subscriptionsRef = useRef<Map<string, Subscription>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const relayIndexRef = useRef(0);

  const isValidEvent = useCallback((event: NostrEvent): boolean => {
    try {
      if (!event?.id || !event?.pubkey || !event?.sig) return false;
      if (typeof event.kind !== "number" || typeof event.created_at !== "number") return false;
      return verifyEvent(event);
    } catch {
      return false;
    }
  }, []);

  const sendToRelay = useCallback((data: any[]) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }, []);

  const activateSubscriptions = useCallback(() => {
    subscriptionsRef.current.forEach(sub => {
      sendToRelay(["REQ", sub.id, ...sub.filters]);
    });
  }, [sendToRelay]);

  const handleMessage = useCallback(
    (wsEvent: MessageEvent) => {
      if (!mountedRef.current) return;
      try {
        const message = JSON.parse(wsEvent.data);
        const [type, subId, payload] = message;

        if (type === "EVENT" && payload) {
          if (!isValidEvent(payload)) return;
          const sub = subscriptionsRef.current.get(subId);
          sub?.onEvent(payload);
        } else if (type === "EOSE") {
          const sub = subscriptionsRef.current.get(subId);
          sub?.onEose?.();
        }
      } catch (error) {
        console.error("Error parsing relay message:", error);
      }
    },
    [isValidEvent],
  );

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    const ws = wsRef.current;
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      wsRef.current = null;
    }
  }, []);

  const connect = useCallback(
    (relayUrl: string, isReconnect = false) => {
      if (!mountedRef.current) return;
      cleanup();

      setStatus("connecting");
      if (!isReconnect) {
        setReconnectAttempts(0);
      }

      const ws = new WebSocket(relayUrl);
      wsRef.current = ws;

      const timeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      }, CONNECTION_TIMEOUT);

      ws.onopen = () => {
        if (!mountedRef.current) {
          ws.close();
          return;
        }
        clearTimeout(timeout);
        setStatus("connected");
        setActiveRelay(relayUrl);
        setReconnectAttempts(0);
        relayIndexRef.current = DEFAULT_RELAYS.indexOf(relayUrl);
        if (relayIndexRef.current === -1) relayIndexRef.current = 0;
        activateSubscriptions();
      };

      ws.onmessage = handleMessage;

      ws.onerror = () => {
        clearTimeout(timeout);
      };

      ws.onclose = closeEvent => {
        clearTimeout(timeout);
        if (!mountedRef.current) return;

        wsRef.current = null;
        setStatus("disconnected");

        if (closeEvent.code !== 1000 && closeEvent.code !== 1001 && mountedRef.current) {
          setReconnectAttempts(prev => {
            const next = prev + 1;
            if (next <= MAX_RECONNECT_ATTEMPTS) {
              reconnectTimeoutRef.current = setTimeout(
                () => {
                  if (mountedRef.current) {
                    const nextRelayIdx = (relayIndexRef.current + (next > 2 ? 1 : 0)) % DEFAULT_RELAYS.length;
                    relayIndexRef.current = nextRelayIdx;
                    connect(DEFAULT_RELAYS[nextRelayIdx], true);
                  }
                },
                RECONNECT_DELAY * Math.min(next, 3),
              );
            } else {
              setStatus("error");
            }
            return next;
          });
        }
      };
    },
    [cleanup, handleMessage, activateSubscriptions],
  );

  const subscribe = useCallback(
    (id: string, filters: NostrFilter[], onEvent: (event: NostrEvent) => void, onEose?: () => void) => {
      const sub: Subscription = { id, filters, onEvent, onEose };
      subscriptionsRef.current.set(id, sub);

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        sendToRelay(["REQ", id, ...filters]);
      }

      return () => {
        subscriptionsRef.current.delete(id);
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          sendToRelay(["CLOSE", id]);
        }
      };
    },
    [sendToRelay],
  );

  const publish = useCallback(async (event: NostrEvent): Promise<boolean> => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;

    return new Promise(resolve => {
      const timeout = setTimeout(() => resolve(false), 5000);

      const handler = (msg: MessageEvent) => {
        try {
          const data = JSON.parse(msg.data);
          if (data[0] === "OK" && data[1] === event.id) {
            clearTimeout(timeout);
            ws.removeEventListener("message", handler);
            resolve(data[2] === true);
          }
        } catch {
          // ignore
        }
      };

      ws.addEventListener("message", handler);
      ws.send(JSON.stringify(["EVENT", event]));
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect(DEFAULT_RELAYS[0]);
    return () => {
      mountedRef.current = false;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <NostrContext.Provider
      value={{
        status,
        activeRelay,
        reconnectAttempts,
        subscribe,
        publish,
        ws: wsRef.current,
      }}
    >
      {children}
    </NostrContext.Provider>
  );
}

export function useNostr() {
  const ctx = useContext(NostrContext);
  if (!ctx) throw new Error("useNostr must be used within NostrProvider");
  return ctx;
}
