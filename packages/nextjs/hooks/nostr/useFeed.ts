"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useNostr } from "~~/contexts/NostrContext";
import { useProfileCache } from "~~/contexts/ProfileCacheContext";
import type { NostrEvent } from "~~/types/nostr";

interface UseFeedOptions {
  authors?: string[];
  since?: number;
  limit?: number;
}

export function useFeed(options?: UseFeedOptions) {
  const { subscribe, status } = useNostr();
  const { fetchProfiles } = useProfileCache();
  const [events, setEvents] = useState<NostrEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const seenRef = useRef<Set<string>>(new Set());
  const profileBatchRef = useRef<Set<string>>(new Set());
  const profileTimerRef = useRef<NodeJS.Timeout | null>(null);

  const flushProfileBatch = useCallback(() => {
    if (profileBatchRef.current.size > 0) {
      fetchProfiles(Array.from(profileBatchRef.current));
      profileBatchRef.current.clear();
    }
  }, [fetchProfiles]);

  useEffect(() => {
    if (status !== "connected") return;

    seenRef.current.clear();
    setEvents([]);
    setLoading(true);

    const defaultSince = Math.floor(Date.now() / 1000) - (options?.authors ? 7 * 86400 : 86400);

    const filters: any[] = [
      {
        kinds: [1],
        ...(options?.authors && options.authors.length > 0 ? { authors: options.authors } : {}),
        since: options?.since ?? defaultSince,
        limit: options?.limit ?? 100,
      },
    ];

    const unsub = subscribe(
      options?.authors ? "feed-following" : "feed-global",
      filters,
      (event: NostrEvent) => {
        if (event.kind !== 1) return;
        if (seenRef.current.has(event.id)) return;
        seenRef.current.add(event.id);

        setEvents(prev => {
          const insertIdx = prev.findIndex(e => e.created_at < event.created_at);
          if (insertIdx === -1) return [...prev, event];
          const next = [...prev];
          next.splice(insertIdx, 0, event);
          return next;
        });

        profileBatchRef.current.add(event.pubkey);
        if (profileTimerRef.current) clearTimeout(profileTimerRef.current);
        profileTimerRef.current = setTimeout(flushProfileBatch, 200);
      },
      () => setLoading(false),
    );

    return () => {
      unsub();
      if (profileTimerRef.current) clearTimeout(profileTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, options?.authors?.join(",")]);

  const refresh = useCallback(() => {
    seenRef.current.clear();
    setEvents([]);
    setLoading(true);
  }, []);

  return { events, loading, refresh };
}
