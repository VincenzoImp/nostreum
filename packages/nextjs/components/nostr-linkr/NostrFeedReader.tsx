"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { getEventHash } from "nostr-tools";
import {
  ArrowPathIcon,
  ChatBubbleLeftIcon,
  EyeIcon,
  HeartIcon,
  LinkIcon,
  PlusIcon,
  UserMinusIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth/notification";

/**
 * Nostr Event Interface
 * Represents a Nostr event according to NIP-01 specification
 */
interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

/**
 * Author Profile Interface
 * Contains author information and Ethereum link status
 */
interface AuthorProfile {
  pubkey: string;
  name?: string;
  about?: string;
  picture?: string;
  ethereumAddress?: string;
  isFollowed: boolean;
}

/**
 * WebSocket Connection Interface
 * Manages connection to Nostr relays
 */
interface RelayConnection {
  ws: WebSocket | null;
  url: string;
  connected: boolean;
}

/**
 * NostrFeedReader Component
 *
 * A Nostr feed reader that shows only posts from followed users.
 * Features include:
 * - Manual refresh only (no auto-refresh)
 * - Following-only feed
 * - Profile viewing with links
 * - Following/unfollowing users
 * - Posting new notes
 */
export const NostrFeedReader = () => {
  // State for managing events and UI
  const [events, setEvents] = useState<NostrEvent[]>([]);
  const [authors, setAuthors] = useState<Map<string, AuthorProfile>>(new Map());
  const [loading, setLoading] = useState(false);
  const [relay, setRelay] = useState<RelayConnection>({ ws: null, url: "wss://relay.damus.io", connected: false });
  const [newNote, setNewNote] = useState("");
  const [showPostForm, setShowPostForm] = useState(false);
  const [followedPubkeys, setFollowedPubkeys] = useState<Set<string>>(new Set());
  const [subscriptionActive, setSubscriptionActive] = useState(false);

  // Default relay URLs for connecting to Nostr network
  const DEFAULT_RELAYS = [
    "wss://relay.damus.io",
    "wss://nos.lol",
    "wss://relay.nostr.band",
    "wss://nostr-pub.wellorder.net",
  ];

  /**
   * Hook to read Ethereum address for a given Nostr pubkey
   * This will be called dynamically for each author
   */
  const useEthereumAddress = (pubkey: string) => {
    const { data: ethereumAddress } = useScaffoldReadContract({
      contractName: "NostrLinkr",
      functionName: "pubkeyAddress",
      args: [pubkey ? `0x${pubkey}` : undefined],
    });
    return ethereumAddress;
  };

  /**
   * Handle text note events (kind 1)
   * Adds new notes to the feed and sorts by timestamp
   */
  const handleTextNote = useCallback((event: NostrEvent) => {
    setEvents(prev => {
      // Check if event already exists
      const exists = prev.some(e => e.id === event.id);
      if (exists) return prev;

      // Add new event and sort by timestamp (newest first)
      const newEvents = [...prev, event].sort((a, b) => b.created_at - a.created_at);
      return newEvents;
    });
  }, []);

  /**
   * Handle profile metadata events (kind 0)
   * Updates author information with profile data
   */
  const handleProfileMetadata = useCallback(
    (event: NostrEvent) => {
      try {
        const profileData = JSON.parse(event.content);

        setAuthors(prev => {
          const newAuthors = new Map(prev);
          const existingAuthor = newAuthors.get(event.pubkey) || {
            pubkey: event.pubkey,
            isFollowed: followedPubkeys.has(event.pubkey),
          };

          newAuthors.set(event.pubkey, {
            ...existingAuthor,
            name: profileData.name || profileData.display_name,
            about: profileData.about,
            picture: profileData.picture,
          });

          return newAuthors;
        });
      } catch (error) {
        console.error("Error parsing profile metadata:", error);
      }
    },
    [followedPubkeys],
  );

  /**
   * Handle incoming messages from Nostr relay
   * Processes different types of events and updates state accordingly
   */
  const handleRelayMessage = useCallback(
    (message: any[]) => {
      const [type, subscriptionId, event] = message;

      if (type === "EVENT") {
        if (event.kind === 1) {
          // Text note event - only add if from followed user
          if (followedPubkeys.has(event.pubkey)) {
            handleTextNote(event);
          }
        } else if (event.kind === 0) {
          // Profile metadata event
          handleProfileMetadata(event);
        }
      } else if (type === "EOSE") {
        // End of stored events
        console.log(`End of stored events for subscription: ${subscriptionId}`);
        if (subscriptionId === "following-feed" || subscriptionId === "following-profiles") {
          setLoading(false);
        }
      }
    },
    [followedPubkeys, handleTextNote, handleProfileMetadata],
  );

  /**
   * Connect to a Nostr relay (without auto-subscribing)
   * Only establishes connection, subscription happens on manual refresh
   */
  const connectToRelay = useCallback(
    async (relayUrl: string) => {
      try {
        setLoading(true);

        // Close existing connection if any
        if (relay.ws && relay.ws.readyState === WebSocket.OPEN) {
          relay.ws.close();
        }

        const ws = new WebSocket(relayUrl);

        ws.onopen = () => {
          console.log(`Connected to relay: ${relayUrl}`);
          setRelay({ ws, url: relayUrl, connected: true });
          notification.success(`Connected to ${relayUrl}`);
        };

        ws.onmessage = event => {
          try {
            const message = JSON.parse(event.data);
            handleRelayMessage(message);
          } catch (error) {
            console.error("Error parsing relay message:", error);
          }
        };

        ws.onerror = error => {
          console.error("WebSocket error:", error);
          notification.error(`Failed to connect to relay: ${relayUrl}`);
        };

        ws.onclose = () => {
          console.log(`Disconnected from relay: ${relayUrl}`);
          setRelay(prev => ({ ...prev, connected: false }));
          setSubscriptionActive(false);
        };
      } catch (error) {
        console.error("Error connecting to relay:", error);
        notification.error("Failed to connect to Nostr relay");
      } finally {
        setLoading(false);
      }
    },
    [relay.ws, handleRelayMessage],
  );

  /**
   * Manual refresh function - fetches posts from followed users only
   * This is the only way to update the feed
   */
  const refreshFeed = useCallback(() => {
    if (!relay.ws || !relay.connected) {
      notification.error("Not connected to relay. Please connect first.");
      return;
    }

    if (followedPubkeys.size === 0) {
      notification.info("No users followed yet. Follow some users to see their posts!");
      return;
    }

    setLoading(true);
    setEvents([]); // Clear existing events
    setSubscriptionActive(true);

    try {
      // Convert followed pubkeys to array for the filter
      const followedArray = Array.from(followedPubkeys);

      // Subscribe to recent text notes from followed users only
      const subscriptionMessage = JSON.stringify([
        "REQ",
        "following-feed",
        {
          kinds: [1], // Text notes only
          authors: followedArray, // Only from followed users
          limit: 100, // Limit to 100 recent notes
          since: Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60, // Last 7 days
        },
      ]);

      relay.ws.send(subscriptionMessage);

      // Also get profile metadata for followed users
      const profileSubscription = JSON.stringify([
        "REQ",
        "following-profiles",
        {
          kinds: [0], // Profile metadata
          authors: followedArray,
        },
      ]);

      relay.ws.send(profileSubscription);

      notification.success(`Refreshing feed from ${followedPubkeys.size} followed users...`);
    } catch (error) {
      console.error("Error refreshing feed:", error);
      notification.error("Failed to refresh feed");
      setLoading(false);
    }
  }, [relay.ws, relay.connected, followedPubkeys]);

  /**
   * Post a new note to the Nostr network
   * Creates, signs, and publishes a new text note event
   */
  const postNote = async () => {
    if (!newNote.trim() || !window.nostr) {
      notification.error("Please enter a note and ensure Nostr extension is available");
      return;
    }

    try {
      setLoading(true);

      // Get user's public key
      const pubkey = await window.nostr.getPublicKey();

      // Create new note event
      const noteEvent = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: newNote.trim(),
        pubkey: pubkey,
      };

      // Calculate event ID
      const eventWithId = {
        ...noteEvent,
        id: getEventHash(noteEvent),
      };

      // Sign the event
      const signedEvent = await window.nostr.signEvent(eventWithId);

      // Publish to connected relay
      if (relay.ws && relay.connected) {
        const publishMessage = JSON.stringify(["EVENT", signedEvent]);
        relay.ws.send(publishMessage);

        notification.success("Note published successfully!");
        setNewNote("");
        setShowPostForm(false);

        // Add to local feed if user follows themselves or if it's their own post
        if (followedPubkeys.has(pubkey)) {
          handleTextNote(signedEvent);
        }
      } else {
        notification.error("Not connected to any relay");
      }
    } catch (error) {
      console.error("Error posting note:", error);
      notification.error("Failed to post note");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle follow status for a user
   * Manages local follow list (in production, this would sync with Nostr contact lists)
   */
  const toggleFollow = useCallback((pubkey: string) => {
    setFollowedPubkeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pubkey)) {
        newSet.delete(pubkey);
        notification.success("Unfollowed user");
      } else {
        newSet.add(pubkey);
        notification.success("Following user");
      }

      // Save to localStorage for persistence
      localStorage.setItem("nostr-following", JSON.stringify(Array.from(newSet)));
      return newSet;
    });

    // Update author follow status
    setAuthors(prev => {
      const newAuthors = new Map(prev);
      const author = newAuthors.get(pubkey);
      if (author) {
        newAuthors.set(pubkey, {
          ...author,
          isFollowed: !author.isFollowed,
        });
      }
      return newAuthors;
    });
  }, []);

  /**
   * Load following list from localStorage on component mount
   */
  useEffect(() => {
    const savedFollowing = localStorage.getItem("nostr-following");
    if (savedFollowing) {
      try {
        const followingArray = JSON.parse(savedFollowing);
        setFollowedPubkeys(new Set(followingArray));
      } catch (error) {
        console.error("Error loading following list:", error);
      }
    }
  }, []);

  /**
   * Format timestamp for display
   */
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}m ago`;
    }
  };

  /**
   * Component for displaying individual author information
   */
  const AuthorInfo = ({ pubkey }: { pubkey: string }) => {
    const author = authors.get(pubkey);
    const ethereumAddress = useEthereumAddress(pubkey);

    return (
      <div className="flex items-center gap-3 mb-2">
        {/* Author avatar */}
        <div className="avatar">
          <div className="w-10 h-10 rounded-full">
            {author?.picture ? (
              <Image src={author.picture} alt="Avatar" className="rounded-full" width={40} height={40} />
            ) : (
              <div className="bg-primary text-primary-content flex items-center justify-center w-10 h-10 rounded-full">
                {(author?.name?.[0] || pubkey.slice(0, 2)).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Author details */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{author?.name || `${pubkey.slice(0, 8)}...${pubkey.slice(-4)}`}</span>

            {/* Ethereum address link indicator */}
            {ethereumAddress && ethereumAddress !== "0x0000000000000000000000000000000000000000" && (
              <div className="flex items-center gap-1 text-xs bg-primary text-primary-content px-2 py-1 rounded-full">
                <LinkIcon className="w-3 h-3" />
                <span>ETH</span>
              </div>
            )}
          </div>
        </div>

        {/* View Profile Link */}
        <Link href={`/profile/${pubkey}`} className="btn btn-ghost btn-xs">
          <EyeIcon className="w-3 h-3" />
          View
        </Link>

        {/* Follow/Unfollow button */}
        <button
          className={`btn btn-xs ${author?.isFollowed ? "btn-error" : "btn-primary"}`}
          onClick={() => toggleFollow(pubkey)}
        >
          {author?.isFollowed ? (
            <>
              <UserMinusIcon className="w-3 h-3" />
              Unfollow
            </>
          ) : (
            <>
              <UserPlusIcon className="w-3 h-3" />
              Follow
            </>
          )}
        </button>
      </div>
    );
  };

  /**
   * Component for displaying individual note/event
   */
  const EventCard = ({ event }: { event: NostrEvent }) => {
    const ethereumAddress = useEthereumAddress(event.pubkey);

    return (
      <div className="card bg-base-100 shadow-md mb-4">
        <div className="card-body p-4">
          {/* Author information */}
          <AuthorInfo pubkey={event.pubkey} />

          {/* Note content */}
          <div className="text-sm mb-3">
            <p className="whitespace-pre-wrap break-words">{event.content}</p>
          </div>

          {/* Event metadata */}
          <div className="text-xs text-base-content/50 space-y-1">
            <p>
              <strong>Created:</strong> {formatTimestamp(event.created_at)}
            </p>
            <p>
              <strong>Event ID:</strong> {event.id.slice(0, 16)}...
            </p>
            {ethereumAddress && ethereumAddress !== "0x0000000000000000000000000000000000000000" && (
              <p>
                <strong>Ethereum:</strong> <Address address={ethereumAddress} size="xs" />
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-base-300">
            <button className="btn btn-ghost btn-xs flex items-center gap-1">
              <HeartIcon className="w-4 h-4" />
              <span>Like</span>
            </button>
            <button className="btn btn-ghost btn-xs flex items-center gap-1">
              <ChatBubbleLeftIcon className="w-4 h-4" />
              <span>Reply</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Connect to default relay on component mount (but don't subscribe)
  useEffect(() => {
    connectToRelay(DEFAULT_RELAYS[0]);

    // Cleanup on unmount
    return () => {
      if (relay.ws) {
        relay.ws.close();
      }
    };
  }, [connectToRelay, DEFAULT_RELAYS]);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">🦜 Following Feed</h1>
        <p className="text-base-content/70">Posts from users you follow • Manual refresh only</p>
      </div>

      {/* Connection status and controls */}
      <div className="card bg-base-200 shadow-md">
        <div className="card-body p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${relay.connected ? "bg-success" : "bg-error"}`}></div>
              <span className="text-sm">{relay.connected ? `Connected to ${relay.url}` : "Disconnected"}</span>
            </div>

            <div className="flex items-center gap-2">
              <button className="btn btn-sm btn-primary" onClick={refreshFeed} disabled={loading || !relay.connected}>
                {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : "Refresh Feed"}
              </button>

              <button className="btn btn-sm btn-secondary" onClick={() => setShowPostForm(!showPostForm)}>
                <PlusIcon className="w-4 h-4" />
                Post
              </button>
            </div>
          </div>

          {/* Post form */}
          {showPostForm && (
            <div className="space-y-3">
              <textarea
                className="textarea textarea-bordered w-full"
                placeholder="What's on your mind?"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <button className="btn btn-sm btn-ghost" onClick={() => setShowPostForm(false)}>
                  Cancel
                </button>
                <button className="btn btn-sm btn-primary" onClick={postNote} disabled={loading || !newNote.trim()}>
                  {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : "Post Note"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feed stats */}
      <div className="stats shadow">
        <div className="stat">
          <div className="stat-title">Following</div>
          <div className="stat-value text-2xl">{followedPubkeys.size}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Posts</div>
          <div className="stat-value text-2xl">{events.length}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Status</div>
          <div className="stat-value text-lg">{subscriptionActive ? "Active" : "Idle"}</div>
        </div>
      </div>

      {/* Instructions when no following */}
      {followedPubkeys.size === 0 && (
        <div className="text-center py-8 bg-info/20 rounded-xl">
          <h3 className="text-lg font-semibold mb-2">👥 No Users Followed</h3>
          <p className="text-sm opacity-80 mb-4">
            Follow some users to see their posts in your feed. You can discover users through the profile viewer.
          </p>
          <Link href="/profile" className="btn btn-primary btn-sm">
            Find Users to Follow
          </Link>
        </div>
      )}

      {/* Feed */}
      <div className="space-y-4">
        {loading && events.length === 0 ? (
          <div className="text-center py-8">
            <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p>Loading feed...</p>
          </div>
        ) : events.length === 0 && followedPubkeys.size > 0 ? (
          <div className="text-center py-8">
            <p className="text-base-content/70">No recent posts from followed users. Try refreshing the feed.</p>
          </div>
        ) : (
          events.map(event => <EventCard key={event.id} event={event} />)
        )}
      </div>
    </div>
  );
};
