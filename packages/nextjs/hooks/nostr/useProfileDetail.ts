"use client";

import { useEffect, useRef, useState } from "react";
import { useNostr } from "~~/contexts/NostrContext";
import type { AuthorProfile, NostrEvent } from "~~/types/nostr";

export function useProfileDetail(pubkey: string | undefined) {
  const { subscribe, status } = useNostr();
  const [profile, setProfile] = useState<AuthorProfile | null>(null);
  const [posts, setPosts] = useState<NostrEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!pubkey || status !== "connected") return;

    seenRef.current.clear();
    setProfile(null);
    setPosts([]);
    setLoading(true);

    const unsub = subscribe(
      `profile-${pubkey}`,
      [
        { authors: [pubkey], kinds: [0], limit: 1 },
        { authors: [pubkey], kinds: [1], limit: 50 },
      ],
      (event: NostrEvent) => {
        if (event.kind === 0) {
          try {
            const data = JSON.parse(event.content);
            setProfile({
              pubkey: event.pubkey,
              name: data.name || data.display_name,
              display_name: data.display_name,
              about: data.about,
              picture: data.picture,
              banner: data.banner,
              nip05: data.nip05,
              website: data.website,
              lud16: data.lud16,
            });
          } catch {
            // ignore malformed
          }
        } else if (event.kind === 1) {
          if (seenRef.current.has(event.id)) return;
          seenRef.current.add(event.id);
          setPosts(prev => {
            const insertIdx = prev.findIndex(e => e.created_at < event.created_at);
            if (insertIdx === -1) return [...prev, event];
            const next = [...prev];
            next.splice(insertIdx, 0, event);
            return next;
          });
        }
      },
      () => setLoading(false),
    );

    return unsub;
  }, [pubkey, status, subscribe]);

  return { profile, posts, loading };
}
