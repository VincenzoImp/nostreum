"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  connecting: boolean;
  lastConnectAttempt: number;
  reconnectAttempts: number;
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
 * - Safe relay connection handling
 */
export const NostrFeedReader = () => {
  // State for managing events and UI
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
  const [newNote, setNewNote] = useState("");
  const [showPostForm, setShowPostForm] = useState(false);
  const [followedPubkeys, setFollowedPubkeys] = useState<Set<string>>(new Set());
  const [subscriptionActive, setSubscriptionActive] = useState(false);

  // Refs to prevent stale closures and manage cleanup
  const relayRef = useRef<RelayConnection>(relay);
  const mountedRef = useRef(true);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectPromiseRef = useRef<Promise<void> | null>(null);

  // Constants for connection management
  const DEFAULT_RELAYS = [
    "wss://relay.damus.io",
    "wss://nos.lol",
    "wss://relay.nostr.band",
    "wss://nostr-pub.wellorder.net",
  ];

  const CONNECTION_TIMEOUT = 10000; // 10 seconds
  const RECONNECT_DELAY = 2000; // 2 seconds
  const MAX_RECONNECT_ATTEMPTS = 5;
  const MIN_RECONNECT_INTERVAL = 1000; // Prevent rapid reconnections

  // Update ref when relay state changes
  useEffect(() => {
    relayRef.current = relay;
  }, [relay]);

  /**
   * Hook to read Ethereum address for a given Nostr pubkey
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
   * Clean up existing WebSocket connection
   */
  const cleanupConnection = useCallback(() => {
    if (relayRef.current.ws) {
      const ws = relayRef.current.ws;

      // Remove event listeners to prevent callbacks
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;

      // Close connection if not already closed
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    }

    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Clear connect promise
    connectPromiseRef.current = null;
  }, []);

  /**
   * Handle text note events (kind 1)
   */
  const handleTextNote = useCallback((event: NostrEvent) => {
    if (!mountedRef.current) return;

    setEvents(prev => {
      const exists = prev.some(e => e.id === event.id);
      if (exists) return prev;

      const newEvents = [...prev, event].sort((a, b) => b.created_at - a.created_at);
      return newEvents;
    });
  }, []);

  /**
   * Handle profile metadata events (kind 0)
   */
  const handleProfileMetadata = useCallback((event: NostrEvent) => {
    if (!mountedRef.current) return;

    try {
      const profileData = JSON.parse(event.content);

      setAuthors(prev => {
        const newAuthors = new Map(prev);
        const existingAuthor = newAuthors.get(event.pubkey) || {
          pubkey: event.pubkey,
          isFollowed: false,
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
  }, []);

  /**
   * Handle incoming messages from Nostr relay
   */
  const handleRelayMessage = useCallback(
    (message: any[]) => {
      if (!mountedRef.current) return;

      const [type, subscriptionId, event] = message;

      if (type === "EVENT") {
        if (event.kind === 1) {
          // Only add text notes from followed users
          setFollowedPubkeys(current => {
            if (current.has(event.pubkey)) {
              handleTextNote(event);
            }
            return current;
          });
        } else if (event.kind === 0) {
          handleProfileMetadata(event);
        }
      } else if (type === "EOSE") {
        console.log(`End of stored events for subscription: ${subscriptionId}`);
        if (subscriptionId === "following-feed" || subscriptionId === "following-profiles") {
          setLoading(false);
        }
      }
    },
    [handleTextNote, handleProfileMetadata],
  );

  /**
   * Connect to a Nostr relay with proper error handling and cleanup
   */
  const connectToRelay = useCallback(
    async (relayUrl: string, isReconnect: boolean = false) => {
      // Check if component is still mounted
      if (!mountedRef.current) {
        console.log("Component unmounted, skipping connection");
        return;
      }

      // Prevent multiple simultaneous connections
      if (connectPromiseRef.current) {
        return connectPromiseRef.current;
      }

      // Prevent rapid reconnection attempts
      const now = Date.now();
      if (now - relayRef.current.lastConnectAttempt < MIN_RECONNECT_INTERVAL) {
        return;
      }

      // Check if already connected to this relay
      if (relayRef.current.connected && relayRef.current.url === relayUrl) {
        return;
      }

      const connectPromise = new Promise<void>((resolve, reject) => {
        // Double-check component is still mounted
        if (!mountedRef.current) {
          reject(new Error("Component unmounted"));
          return;
        }

        // Clean up existing connection
        cleanupConnection();

        setRelay(prev => ({
          ...prev,
          connecting: true,
          lastConnectAttempt: now,
          reconnectAttempts: isReconnect ? prev.reconnectAttempts + 1 : 0,
        }));

        if (!isReconnect) {
          setLoading(true);
        }

        try {
          const ws = new WebSocket(relayUrl);

          // Set connection timeout
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
            console.log(`Connected to relay: ${relayUrl}`);

            setRelay(prev => ({
              ...prev,
              ws,
              url: relayUrl,
              connected: true,
              connecting: false,
              reconnectAttempts: 0,
            }));

            if (!isReconnect) {
              notification.success(`Connected to ${relayUrl}`);
            }

            resolve();
          };

          ws.onmessage = event => {
            if (!mountedRef.current) return;

            try {
              const message = JSON.parse(event.data);
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

            if (!isReconnect) {
              notification.error(`Failed to connect to relay: ${relayUrl}`);
            }

            reject(error);
          };

          ws.onclose = event => {
            clearTimeout(connectionTimeout);
            console.log(`Disconnected from relay: ${relayUrl}`, event.code, event.reason);

            if (!mountedRef.current) {
              reject(new Error("Component unmounted"));
              return;
            }

            setRelay(prev => ({
              ...prev,
              ws: null,
              connected: false,
              connecting: false,
            }));

            setSubscriptionActive(false);

            // Attempt reconnection if it was an unexpected disconnection and component is still mounted
            if (event.code !== 1000 && event.code !== 1001 && mountedRef.current) {
              const currentRelay = relayRef.current;
              if (currentRelay.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                console.log(`Attempting reconnection in ${RECONNECT_DELAY}ms...`);

                reconnectTimeoutRef.current = setTimeout(() => {
                  // Double-check component is still mounted before reconnecting
                  if (mountedRef.current) {
                    connectToRelay(relayUrl, true).catch(err => {
                      console.error("Reconnection failed:", err);
                    });
                  }
                }, RECONNECT_DELAY);
              } else {
                console.log("Max reconnection attempts reached");
                if (mountedRef.current) {
                  notification.error("Connection lost. Please try connecting manually.");
                }
              }
            }

            if (!isReconnect) {
              reject(new Error("Connection closed"));
            }
          };
        } catch (error) {
          console.error("Error creating WebSocket:", error);

          if (mountedRef.current) {
            setRelay(prev => ({
              ...prev,
              connecting: false,
            }));
          }

          reject(error);
        } finally {
          if (!isReconnect && mountedRef.current) {
            setLoading(false);
          }
        }
      });

      connectPromiseRef.current = connectPromise;

      try {
        await connectPromise;
      } catch (error) {
        // Only log if component is still mounted
        if (mountedRef.current) {
          console.error("Connection failed:", error);
        }
      } finally {
        connectPromiseRef.current = null;
      }
    },
    [cleanupConnection, handleRelayMessage],
  );

  /**
   * Manual refresh function - fetches posts from followed users only
   */
  const refreshFeed = useCallback(() => {
    if (!relay.connected || !relay.ws) {
      notification.error("Not connected to relay. Please connect first.");
      return;
    }

    if (followedPubkeys.size === 0) {
      notification.info("No users followed yet. Follow some users to see their posts!");
      return;
    }

    setLoading(true);
    setEvents([]);
    setSubscriptionActive(true);

    try {
      const followedArray = Array.from(followedPubkeys);

      // Close existing subscriptions
      relay.ws.send(JSON.stringify(["CLOSE", "following-feed"]));
      relay.ws.send(JSON.stringify(["CLOSE", "following-profiles"]));

      // Subscribe to recent text notes from followed users
      const subscriptionMessage = JSON.stringify([
        "REQ",
        "following-feed",
        {
          kinds: [1],
          authors: followedArray,
          limit: 100,
          since: Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60,
        },
      ]);

      relay.ws.send(subscriptionMessage);

      // Get profile metadata for followed users
      const profileSubscription = JSON.stringify([
        "REQ",
        "following-profiles",
        {
          kinds: [0],
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
  }, [relay.connected, relay.ws, followedPubkeys]);

  /**
   * Post a new note to the Nostr network
   */
  const postNote = async () => {
    if (!newNote.trim() || !window.nostr) {
      notification.error("Please enter a note and ensure Nostr extension is available");
      return;
    }

    if (!relay.connected || !relay.ws) {
      notification.error("Not connected to relay. Please connect first.");
      return;
    }

    try {
      setLoading(true);

      const pubkey = await window.nostr.getPublicKey();

      const noteEvent = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: newNote.trim(),
        pubkey: pubkey,
      };

      const eventWithId = {
        ...noteEvent,
        id: getEventHash(noteEvent),
      };

      const signedEvent = await window.nostr.signEvent(eventWithId);

      const publishMessage = JSON.stringify(["EVENT", signedEvent]);
      relay.ws.send(publishMessage);

      notification.success("Note published successfully!");
      setNewNote("");
      setShowPostForm(false);

      // Add to local feed if user follows themselves
      if (followedPubkeys.has(pubkey)) {
        handleTextNote(signedEvent);
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
      try {
        localStorage.setItem("nostr-following", JSON.stringify(Array.from(newSet)));
      } catch (error) {
        console.error("Error saving following list:", error);
      }

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

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{author?.name || `${pubkey.slice(0, 8)}...${pubkey.slice(-4)}`}</span>

            {ethereumAddress && ethereumAddress !== "0x0000000000000000000000000000000000000000" && (
              <div className="flex items-center gap-1 text-xs bg-primary text-primary-content px-2 py-1 rounded-full">
                <LinkIcon className="w-3 h-3" />
                <span>ETH</span>
              </div>
            )}
          </div>
        </div>

        <Link href={`/profile/${pubkey}`} className="btn btn-ghost btn-xs">
          <EyeIcon className="w-3 h-3" />
          View
        </Link>

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
          <AuthorInfo pubkey={event.pubkey} />

          <div className="text-sm mb-3">
            <p className="whitespace-pre-wrap break-words">{event.content}</p>
          </div>

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

  // Load following list from localStorage on component mount
  useEffect(() => {
    try {
      const savedFollowing = localStorage.getItem("nostr-following");
      if (savedFollowing) {
        const followingArray = JSON.parse(savedFollowing);
        setFollowedPubkeys(new Set(followingArray));
      }
    } catch (error) {
      console.error("Error loading following list:", error);
    }
  }, []);

  // Connect to default relay on component mount
  useEffect(() => {
    // Set mounted flag
    mountedRef.current = true;

    // Connect to relay
    connectToRelay(DEFAULT_RELAYS[0]);

    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      cleanupConnection();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty to prevent reconnection loops

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
              <div
                className={`w-3 h-3 rounded-full ${
                  relay.connected ? "bg-success" : relay.connecting ? "bg-warning animate-pulse" : "bg-error"
                }`}
              ></div>
              <span className="text-sm">
                {relay.connected ? `Connected to ${relay.url}` : relay.connecting ? "Connecting..." : "Disconnected"}
              </span>
              {relay.reconnectAttempts > 0 && (
                <span className="text-xs text-warning">
                  (Attempt {relay.reconnectAttempts}/{MAX_RECONNECT_ATTEMPTS})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button className="btn btn-sm btn-primary" onClick={refreshFeed} disabled={loading || !relay.connected}>
                {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : "Refresh Feed"}
              </button>

              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setShowPostForm(!showPostForm)}
                disabled={!relay.connected}
              >
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
                <button
                  className="btn btn-sm btn-primary"
                  onClick={postNote}
                  disabled={loading || !newNote.trim() || !relay.connected}
                >
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
