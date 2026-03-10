import { useCallback, useEffect, useState } from "react";
import { AuthorProfile } from "~~/types/nostreum";
import { notification } from "~~/utils/scaffold-eth/notification";

const STORAGE_KEY = "nostr-following";

export const useFollowing = (setAuthors: React.Dispatch<React.SetStateAction<Map<string, AuthorProfile>>>) => {
  const [followedPubkeys, setFollowedPubkeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const arr: string[] = JSON.parse(saved);
        setFollowedPubkeys(new Set(arr));
        setAuthors(prev => {
          const next = new Map(prev);
          arr.forEach(pk => {
            const existing = next.get(pk);
            next.set(pk, existing ? { ...existing, isFollowed: true } : { pubkey: pk, isFollowed: true });
          });
          return next;
        });
      }
    } catch (error) {
      console.error("Error loading following list:", error);
    }
  }, [setAuthors]);

  const toggleFollow = useCallback(
    (pubkey: string) => {
      setFollowedPubkeys(prev => {
        const next = new Set(prev);
        if (next.has(pubkey)) {
          next.delete(pubkey);
          notification.success("Unfollowed user");
        } else {
          next.add(pubkey);
          notification.success("Following user");
        }
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
        } catch (error) {
          console.error("Error saving following list:", error);
        }
        return next;
      });

      setAuthors(prev => {
        const next = new Map(prev);
        const author = next.get(pubkey) || { pubkey, isFollowed: false };
        next.set(pubkey, { ...author, isFollowed: !author.isFollowed });
        return next;
      });
    },
    [setAuthors],
  );

  return { followedPubkeys, toggleFollow };
};
