import { useCallback, useEffect, useState } from "react";
import { AuthorProfile } from "~~/types/nostreum";
import { notification } from "~~/utils/scaffold-eth/notification";

const STORAGE_KEY = "nostr-following";

/**
 * Shared hook for managing the Nostr following list.
 * Persists to localStorage and syncs follow status to authors map.
 */
export const useFollowing = (setAuthors: React.Dispatch<React.SetStateAction<Map<string, AuthorProfile>>>) => {
  const [followedPubkeys, setFollowedPubkeys] = useState<Set<string>>(new Set());

  // Load following list from localStorage on mount
  useEffect(() => {
    try {
      const savedFollowing = localStorage.getItem(STORAGE_KEY);
      if (savedFollowing) {
        const followingArray: string[] = JSON.parse(savedFollowing);
        setFollowedPubkeys(new Set(followingArray));

        setAuthors(prev => {
          const newAuthors = new Map(prev);
          followingArray.forEach(pubkey => {
            const author = newAuthors.get(pubkey);
            if (author) {
              newAuthors.set(pubkey, { ...author, isFollowed: true });
            } else {
              newAuthors.set(pubkey, { pubkey, isFollowed: true });
            }
          });
          return newAuthors;
        });
      }
    } catch (error) {
      console.error("Error loading following list:", error);
    }
  }, [setAuthors]);

  const toggleFollow = useCallback(
    (pubkey: string) => {
      setFollowedPubkeys(prev => {
        const newSet = new Set(prev);
        if (newSet.has(pubkey)) {
          newSet.delete(pubkey);
          notification.success("Unfollowed user");
        } else {
          newSet.add(pubkey);
          notification.success("Following user");
        }

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(newSet)));
        } catch (error) {
          console.error("Error saving following list:", error);
        }

        return newSet;
      });

      setAuthors(prev => {
        const newAuthors = new Map(prev);
        const author = newAuthors.get(pubkey) || { pubkey, isFollowed: false };
        newAuthors.set(pubkey, {
          ...author,
          isFollowed: !author.isFollowed,
        });
        return newAuthors;
      });
    },
    [setAuthors],
  );

  return { followedPubkeys, toggleFollow };
};
