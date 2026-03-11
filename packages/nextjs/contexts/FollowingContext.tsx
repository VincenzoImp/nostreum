"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "nostr-following";

interface FollowingContextValue {
  followedPubkeys: Set<string>;
  isFollowing: (pubkey: string) => boolean;
  toggleFollow: (pubkey: string) => void;
  followCount: number;
}

const FollowingContext = createContext<FollowingContextValue | null>(null);

export function FollowingProvider({ children }: { children: React.ReactNode }) {
  const [followedPubkeys, setFollowedPubkeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setFollowedPubkeys(new Set(JSON.parse(saved)));
      }
    } catch (error) {
      console.error("Error loading following list:", error);
    }
  }, []);

  const isFollowing = useCallback((pubkey: string) => followedPubkeys.has(pubkey), [followedPubkeys]);

  const toggleFollow = useCallback((pubkey: string) => {
    setFollowedPubkeys(prev => {
      const next = new Set(prev);
      if (next.has(pubkey)) {
        next.delete(pubkey);
      } else {
        next.add(pubkey);
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch (error) {
        console.error("Error saving following list:", error);
      }
      return next;
    });
  }, []);

  return (
    <FollowingContext.Provider
      value={{
        followedPubkeys,
        isFollowing,
        toggleFollow,
        followCount: followedPubkeys.size,
      }}
    >
      {children}
    </FollowingContext.Provider>
  );
}

export function useFollowingCtx() {
  const ctx = useContext(FollowingContext);
  if (!ctx) throw new Error("useFollowingCtx must be used within FollowingProvider");
  return ctx;
}
