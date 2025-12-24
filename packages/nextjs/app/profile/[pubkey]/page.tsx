"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CalendarIcon,
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  UserMinusIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import { EventCard } from "~~/components/nostreum/EventCard";
import { Address } from "~~/components/scaffold-eth";
import { useNostrConnection } from "~~/hooks/nostreum/useNostrConnection";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { AuthorProfile, NostrEvent } from "~~/types/nostreum";
import { notification } from "~~/utils/scaffold-eth/notification";

/**
 * Profile Detail Page
 *
 * Shows detailed information about a specific Nostr user including:
 * - Profile metadata (name, bio, picture)
 * - Ethereum address verification
 * - User's posts
 * - Follow/unfollow functionality
 * - Handles fallback cases for missing profiles
 */
export default function ProfileDetail() {
  const params = useParams();
  const router = useRouter();
  const pubkey = params.pubkey as string;

  const { loading, setLoading, relay } = useNostrConnection();

  const [userPosts, setUserPosts] = useState<NostrEvent[]>([]);
  const [profile, setProfile] = useState<AuthorProfile | null>(null);
  const [followedPubkeys, setFollowedPubkeys] = useState<Set<string>>(new Set());
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [profileExists, setProfileExists] = useState<boolean | null>(null);
  const [loadAttempts, setLoadAttempts] = useState(0);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Use refs to track timeouts and prevent memory leaks
  const profileTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const redirectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Get Ethereum address for this pubkey - only if valid pubkey
  const validPubkeyForContract = pubkey && isValidPubkey(pubkey) ? (`0x${pubkey}` as `0x${string}`) : undefined;
  const { data: ethereumAddress } = useScaffoldReadContract({
    contractName: "NostrLinkr",
    functionName: "pubkeyAddress",
    args: [validPubkeyForContract],
  });

  /**
   * Validate pubkey format
   */
  function isValidPubkey(key: string): boolean {
    if (!key) return false;
    const cleanKey = key.trim();
    return /^[a-fA-F0-9]{64}$/.test(cleanKey);
  }

  /**
   * Check if this is the fallback pubkey (all zeros)
   */
  function isFallbackPubkey(key: string): boolean {
    return key === "0000000000000000000000000000000000000000000000000000000000000000";
  }

  /**
   * Safe redirect function to prevent multiple redirects and loops
   */
  const safeRedirect = useCallback(
    (url: string, delay: number = 0) => {
      if (hasRedirected || !isMountedRef.current) return;

      console.log(`Redirecting to: ${url} after ${delay}ms`);
      setHasRedirected(true);

      const redirect = () => {
        if (isMountedRef.current) {
          router.push(url);
        }
      };

      if (delay > 0) {
        redirectTimeoutRef.current = setTimeout(redirect, delay);
      } else {
        redirect();
      }
    },
    [hasRedirected, router],
  );

  /**
   * Load following list from localStorage
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedFollowing = localStorage.getItem("nostr-following");
      if (savedFollowing) {
        const followingArray = JSON.parse(savedFollowing);
        if (Array.isArray(followingArray)) {
          setFollowedPubkeys(new Set(followingArray));
        }
      }
    } catch (error) {
      console.error("Error loading following list:", error);
    }
  }, []);

  /**
   * Custom message handler for profile page
   */
  const profileMessageHandler = useCallback(
    (message: any[]) => {
      if (!isMountedRef.current) return;

      try {
        const [type, subscriptionId, event] = message;

        if (type === "EVENT" && event) {
          if (event.kind === 0 && event.pubkey === pubkey) {
            // Profile metadata for this specific user
            try {
              const profileData = JSON.parse(event.content || "{}");
              const newProfile: AuthorProfile = {
                pubkey: event.pubkey,
                name: profileData.name || profileData.display_name || undefined,
                about: profileData.about || undefined,
                picture: profileData.picture || undefined,
                isFollowed: followedPubkeys.has(event.pubkey),
              };
              setProfile(newProfile);
              setProfileExists(true);

              // Clear any pending timeout since we found a profile
              if (profileTimeoutRef.current) {
                clearTimeout(profileTimeoutRef.current);
                profileTimeoutRef.current = null;
              }
            } catch (error) {
              console.error("Error parsing profile metadata:", error);
            }
          } else if (event.kind === 1 && event.pubkey === pubkey) {
            // Posts from this specific user
            setUserPosts(prev => {
              const exists = prev.some(e => e.id === event.id);
              if (exists) return prev;
              const newPosts = [...prev, event].sort((a, b) => b.created_at - a.created_at);
              return newPosts;
            });
          }
        } else if (type === "EOSE") {
          if (subscriptionId === "user-profile") {
            setProfileLoaded(true);
          } else if (subscriptionId === "user-posts") {
            setPostsLoaded(true);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error("Error in profileMessageHandler:", error);
      }
    },
    [pubkey, followedPubkeys, setLoading],
  );

  /**
   * Load profile data and posts
   */
  const loadProfile = useCallback(() => {
    if (!relay.connected || !relay.ws || !pubkey || hasRedirected) {
      if (!relay.connected) {
        notification.error("Not connected to relay");
      }
      return;
    }

    if (!isValidPubkey(pubkey)) {
      notification.error("Invalid pubkey format");
      safeRedirect(`/profile/fallback?reason=invalid_pubkey&input=${encodeURIComponent(pubkey)}`);
      return;
    }

    // Check if this is the fallback pubkey (all zeros)
    if (isFallbackPubkey(pubkey)) {
      safeRedirect("/profile/fallback?reason=no_link");
      return;
    }

    setLoading(true);
    setUserPosts([]);
    setProfile(null);
    setProfileLoaded(false);
    setPostsLoaded(false);
    setProfileExists(null);
    setLoadAttempts(prev => prev + 1);

    try {
      // Close existing subscriptions
      if (relay.ws.readyState === WebSocket.OPEN) {
        relay.ws.send(JSON.stringify(["CLOSE", "user-profile"]));
        relay.ws.send(JSON.stringify(["CLOSE", "user-posts"]));

        // Get profile metadata
        const profileSubscription = JSON.stringify([
          "REQ",
          "user-profile",
          {
            kinds: [0],
            authors: [pubkey],
            limit: 1,
          },
        ]);

        relay.ws.send(profileSubscription);

        // Get user's posts
        const postsSubscription = JSON.stringify([
          "REQ",
          "user-posts",
          {
            kinds: [1],
            authors: [pubkey],
            limit: 50,
          },
        ]);

        relay.ws.send(postsSubscription);

        notification.success("Loading profile...");

        // Set a timeout to check if profile was found
        profileTimeoutRef.current = setTimeout(() => {
          if (!profile && profileLoaded && !hasRedirected && isMountedRef.current) {
            setProfileExists(false);
          }
        }, 10000); // Wait 10 seconds before considering profile not found
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      notification.error("Failed to load profile");
      setLoading(false);
    }
  }, [relay.connected, relay.ws, pubkey, setLoading, safeRedirect, profile, profileLoaded, hasRedirected]);

  /**
   * Toggle follow status
   */
  const toggleFollow = useCallback(() => {
    if (!pubkey || typeof window === "undefined") return;

    const isCurrentlyFollowed = followedPubkeys.has(pubkey);

    setFollowedPubkeys(prev => {
      const newSet = new Set(prev);

      if (isCurrentlyFollowed) {
        newSet.delete(pubkey);
      } else {
        newSet.add(pubkey);
      }

      // Save to localStorage
      try {
        localStorage.setItem("nostr-following", JSON.stringify(Array.from(newSet)));
      } catch (error) {
        console.error("Error saving following list:", error);
      }

      return newSet;
    });

    // Update profile follow status
    if (profile) {
      setProfile(prev =>
        prev
          ? {
              ...prev,
              isFollowed: !isCurrentlyFollowed,
            }
          : null,
      );
    }

    // Show notification
    if (isCurrentlyFollowed) {
      notification.success("Unfollowed user");
    } else {
      notification.success("Following user");
    }
  }, [pubkey, profile, followedPubkeys]);

  /**
   * Override connection to use custom message handler
   */
  useEffect(() => {
    if (relay.connected && relay.ws && !hasRedirected) {
      const originalOnMessage = relay.ws.onmessage;

      relay.ws.onmessage = event => {
        try {
          const message = JSON.parse(event.data);
          profileMessageHandler(message);
        } catch (error) {
          console.error("Error parsing relay message:", error);
        }
      };

      return () => {
        if (relay.ws && relay.ws.onmessage) {
          relay.ws.onmessage = originalOnMessage;
        }
      };
    }
  }, [relay.connected, relay.ws, profileMessageHandler, hasRedirected]);

  /**
   * Initial setup and validation
   */
  useEffect(() => {
    isMountedRef.current = true;

    if (pubkey && !isInitialized) {
      // Reset states for new pubkey
      setHasRedirected(false);
      setIsInitialized(true);

      // Early validation
      if (!isValidPubkey(pubkey)) {
        console.log("Invalid pubkey detected:", pubkey);
        safeRedirect(`/profile/fallback?reason=invalid_pubkey&input=${encodeURIComponent(pubkey)}`);
        return;
      }

      if (isFallbackPubkey(pubkey)) {
        console.log("Fallback pubkey detected");
        safeRedirect("/profile/fallback?reason=no_link");
        return;
      }
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [pubkey, isInitialized, safeRedirect]);

  /**
   * Load profile when ready
   */
  useEffect(() => {
    if (
      pubkey &&
      relay.connected &&
      isInitialized &&
      !hasRedirected &&
      isValidPubkey(pubkey) &&
      !isFallbackPubkey(pubkey)
    ) {
      loadProfile();
    }
  }, [pubkey, relay.connected, isInitialized, hasRedirected, loadProfile]);

  /**
   * Handle profile not found case
   */
  useEffect(() => {
    if (profileExists === false && profileLoaded && loadAttempts > 0 && !hasRedirected && isInitialized) {
      console.log("Profile not found, redirecting to fallback");
      notification.info("Profile not found. Redirecting to fallback page...");
      safeRedirect(`/profile/fallback?reason=not_found&input=${encodeURIComponent(pubkey)}`, 1000);
    }
  }, [profileExists, profileLoaded, loadAttempts, pubkey, safeRedirect, hasRedirected, isInitialized]);

  /**
   * Cleanup timeouts on unmount
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (profileTimeoutRef.current) {
        clearTimeout(profileTimeoutRef.current);
      }
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Reset state when pubkey changes
   */
  useEffect(() => {
    if (pubkey) {
      setHasRedirected(false);
      setIsInitialized(false);
      setProfileExists(null);
      setProfile(null);
      setUserPosts([]);
      setProfileLoaded(false);
      setPostsLoaded(false);
      setLoadAttempts(0);

      // Clear timeouts
      if (profileTimeoutRef.current) {
        clearTimeout(profileTimeoutRef.current);
        profileTimeoutRef.current = null;
      }
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    }
  }, [pubkey]);

  // Loading states and early returns
  if (!pubkey) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="text-center py-8">
          <p className="text-error mb-4">No pubkey provided</p>
          <Link href="/profile" className="btn btn-primary">
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  if (!isValidPubkey(pubkey)) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="text-center py-8">
          <p className="text-error mb-4">Invalid pubkey format</p>
          <Link href="/profile" className="btn btn-primary">
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  // Show loading state for fallback pubkey while redirecting
  if (isFallbackPubkey(pubkey)) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="text-center py-8">
          <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Redirecting to fallback page...</p>
        </div>
      </div>
    );
  }

  const displayName = profile?.name || `${pubkey.slice(0, 8)}...${pubkey.slice(-4)}`;
  const isFollowed = followedPubkeys.has(pubkey);

  // Show warning if profile might not exist
  const showProfileWarning = profileLoaded && !profile && !loading && !hasRedirected;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Link href="/profile" className="btn btn-ghost btn-sm">
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Search
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Profile</h1>
        </div>
      </div>

      {/* Connection Status */}
      <div className="card bg-base-200 shadow-md">
        <div className="card-body p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  relay.connected ? "bg-success" : relay.connecting ? "bg-warning animate-pulse" : "bg-error"
                }`}
              ></div>
              <span className="text-sm">
                {relay.connected ? `Connected to ${relay.url}` : relay.connecting ? "Connecting..." : "Disconnected"}
              </span>
            </div>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => {
                if (!hasRedirected) {
                  loadProfile();
                }
              }}
              disabled={loading || !relay.connected || hasRedirected}
            >
              {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {/* Profile Warning */}
      {showProfileWarning && (
        <div className="alert alert-warning">
          <ExclamationTriangleIcon className="w-6 h-6" />
          <div>
            <h3 className="font-bold">Profile Not Found</h3>
            <div className="text-xs">
              No profile metadata found for this pubkey. The user may not have published profile information yet, or
              they might not exist on the connected relays.
            </div>
          </div>
          <Link href={`/profile/fallback?reason=not_found&input=${encodeURIComponent(pubkey)}`} className="btn btn-sm">
            More Info
          </Link>
        </div>
      )}

      {/* Profile Information */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body p-6">
          {loading && !profileLoaded ? (
            <div className="text-center py-8">
              <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p>Loading profile...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Profile Header */}
              <div className="flex items-start gap-4">
                <div className="avatar">
                  <div className="w-16 h-16 rounded-full">
                    {profile?.picture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.picture}
                        alt="Avatar"
                        className="rounded-full object-cover w-full h-full"
                        onError={e => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="bg-primary text-primary-content flex items-center justify-center w-16 h-16 rounded-full text-lg font-bold">
                        {displayName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-bold">{displayName}</h2>

                    {ethereumAddress && ethereumAddress !== "0x0000000000000000000000000000000000000000" && (
                      <div className="flex items-center gap-1 text-xs bg-primary text-primary-content px-2 py-1 rounded-full">
                        <LinkIcon className="w-3 h-3" />
                        <span>ETH Verified</span>
                      </div>
                    )}

                    {!profile && profileLoaded && (
                      <div className="flex items-center gap-1 text-xs bg-warning text-warning-content px-2 py-1 rounded-full">
                        <ExclamationTriangleIcon className="w-3 h-3" />
                        <span>No Profile Data</span>
                      </div>
                    )}
                  </div>

                  <button
                    className={`btn btn-sm ${isFollowed ? "btn-error" : "btn-primary"}`}
                    onClick={toggleFollow}
                    disabled={hasRedirected}
                  >
                    {isFollowed ? (
                      <>
                        <UserMinusIcon className="w-4 h-4" />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <UserPlusIcon className="w-4 h-4" />
                        Follow
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Profile Details */}
              <div className="space-y-3">
                {profile?.about && (
                  <div>
                    <h4 className="font-semibold mb-1">About</h4>
                    <p className="text-sm whitespace-pre-wrap">{profile.about}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-semibold mb-1">Public Key</h4>
                    <code className="text-xs bg-base-200 px-2 py-1 rounded break-all">{pubkey}</code>
                  </div>

                  {ethereumAddress && ethereumAddress !== "0x0000000000000000000000000000000000000000" && (
                    <div>
                      <h4 className="font-semibold mb-1">Ethereum Address</h4>
                      <Address address={ethereumAddress} size="sm" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="stats shadow">
        <div className="stat">
          <div className="stat-figure text-primary">
            <DocumentTextIcon className="w-8 h-8" />
          </div>
          <div className="stat-title">Posts</div>
          <div className="stat-value text-2xl">{userPosts.length}</div>
        </div>
        <div className="stat">
          <div className="stat-figure text-secondary">
            <CalendarIcon className="w-8 h-8" />
          </div>
          <div className="stat-title">Status</div>
          <div className="stat-value text-lg">{isFollowed ? "Following" : "Not Following"}</div>
        </div>
      </div>

      {/* User Posts */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <ChatBubbleLeftIcon className="w-5 h-5" />
          Recent Posts
        </h3>

        {loading && !postsLoaded ? (
          <div className="text-center py-8">
            <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p>Loading posts...</p>
          </div>
        ) : userPosts.length === 0 ? (
          <div className="text-center py-8 bg-base-200 rounded-xl">
            <p className="text-base-content/70">No posts found for this user.</p>
            {!profile && profileLoaded && (
              <p className="text-sm text-base-content/50 mt-2">
                This might indicate that the profile doesn't exist or hasn't been active.
              </p>
            )}
          </div>
        ) : (
          userPosts.map(event => (
            <EventCard key={event.id} event={event} author={profile || undefined} showFollowButton={false} />
          ))
        )}
      </div>
    </div>
  );
}
