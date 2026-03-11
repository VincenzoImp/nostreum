"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useNostr } from "./NostrContext";
import type { AuthorProfile, NostrEvent } from "~~/types/nostr";

const PROFILE_TTL = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  profile: AuthorProfile;
  fetchedAt: number;
}

interface ProfileCacheContextValue {
  getProfile: (pubkey: string) => AuthorProfile | undefined;
  fetchProfiles: (pubkeys: string[]) => void;
  profiles: Map<string, AuthorProfile>;
}

const ProfileCacheContext = createContext<ProfileCacheContextValue | null>(null);

export function ProfileCacheProvider({ children }: { children: React.ReactNode }) {
  const { subscribe, status } = useNostr();
  const [profiles, setProfiles] = useState<Map<string, AuthorProfile>>(new Map());
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const pendingRef = useRef<Set<string>>(new Set());
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const batchQueueRef = useRef<Set<string>>(new Set());

  const processBatch = useCallback(() => {
    if (batchQueueRef.current.size === 0 || status !== "connected") return;

    const pubkeys = Array.from(batchQueueRef.current);
    batchQueueRef.current.clear();

    pubkeys.forEach(pk => pendingRef.current.add(pk));

    const subId = `profiles-${Date.now()}`;
    const unsub = subscribe(
      subId,
      [{ authors: pubkeys, kinds: [0] }],
      (event: NostrEvent) => {
        try {
          const data = JSON.parse(event.content);
          const profile: AuthorProfile = {
            pubkey: event.pubkey,
            name: data.name || data.display_name,
            about: data.about,
            picture: data.picture,
            nip05: data.nip05,
          };

          cacheRef.current.set(event.pubkey, { profile, fetchedAt: Date.now() });
          pendingRef.current.delete(event.pubkey);

          setProfiles(prev => {
            const next = new Map(prev);
            next.set(event.pubkey, profile);
            return next;
          });
        } catch {
          // ignore malformed profiles
        }
      },
      () => {
        // EOSE: mark non-responding pubkeys as fetched (empty profile)
        pubkeys.forEach(pk => {
          if (pendingRef.current.has(pk)) {
            pendingRef.current.delete(pk);
            if (!cacheRef.current.has(pk)) {
              const emptyProfile: AuthorProfile = { pubkey: pk };
              cacheRef.current.set(pk, { profile: emptyProfile, fetchedAt: Date.now() });
              setProfiles(prev => {
                const next = new Map(prev);
                next.set(pk, emptyProfile);
                return next;
              });
            }
          }
        });
        unsub();
      },
    );
  }, [subscribe, status]);

  const fetchProfiles = useCallback(
    (pubkeys: string[]) => {
      const now = Date.now();
      const needed = pubkeys.filter(pk => {
        if (pendingRef.current.has(pk)) return false;
        if (batchQueueRef.current.has(pk)) return false;
        const cached = cacheRef.current.get(pk);
        if (cached && now - cached.fetchedAt < PROFILE_TTL) return false;
        return true;
      });

      if (needed.length === 0) return;

      needed.forEach(pk => batchQueueRef.current.add(pk));

      if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
      batchTimerRef.current = setTimeout(processBatch, 100);
    },
    [processBatch],
  );

  const getProfile = useCallback(
    (pubkey: string): AuthorProfile | undefined => {
      const cached = cacheRef.current.get(pubkey);
      if (cached) return cached.profile;
      fetchProfiles([pubkey]);
      return profiles.get(pubkey);
    },
    [fetchProfiles, profiles],
  );

  useEffect(() => {
    return () => {
      if (batchTimerRef.current) clearTimeout(batchTimerRef.current);
    };
  }, []);

  return (
    <ProfileCacheContext.Provider value={{ getProfile, fetchProfiles, profiles }}>
      {children}
    </ProfileCacheContext.Provider>
  );
}

export function useProfileCache() {
  const ctx = useContext(ProfileCacheContext);
  if (!ctx) throw new Error("useProfileCache must be used within ProfileCacheProvider");
  return ctx;
}
