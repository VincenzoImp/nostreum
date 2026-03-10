"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { getEventHash } from "nostr-tools";
import { ArrowPathIcon, PlusIcon } from "@heroicons/react/24/outline";
import { EventCard } from "~~/components/nostreum/EventCard";
import { useFollowing } from "~~/hooks/nostreum/useFollowing";
import { useNostrConnection } from "~~/hooks/nostreum/useNostrConnection";
import { NostrEvent } from "~~/types/nostreum";
import { notification } from "~~/utils/scaffold-eth/notification";

/**
 * Following Feed Component
 *
 * Shows only posts from followed users. Uses the messageFilter parameter
 * of useNostrConnection instead of overriding ws.onmessage.
 */
export default function FollowingFeed() {
  // We need followedPubkeys before creating the hook, so we lift useFollowing first
  // and pass a stable filter based on followedPubkeys via useMemo.
  const [, setTempAuthors] = useState<Map<string, import("~~/types/nostreum").AuthorProfile>>(new Map());
  const { followedPubkeys, toggleFollow } = useFollowing(setTempAuthors);

  // Create a stable filter that only accepts events from followed users
  const followingFilter = useMemo(() => {
    if (followedPubkeys.size === 0) return undefined;
    return (event: NostrEvent) => followedPubkeys.has(event.pubkey);
  }, [followedPubkeys]);

  const {
    events,
    setEvents,
    authors,
    setAuthors,
    loading,
    setLoading,
    relay,
    subscriptionActive,
    setSubscriptionActive,
    MAX_RECONNECT_ATTEMPTS,
  } = useNostrConnection(followingFilter);

  // Sync the follow state into the connection's authors map
  // (useFollowing writes to tempAuthors, but we also need it in the main authors)
  const { toggleFollow: mainToggleFollow } = useFollowing(setAuthors);

  const [newNote, setNewNote] = useState("");
  const [showPostForm, setShowPostForm] = useState(false);

  /**
   * Combined toggle that updates both author maps
   */
  const handleToggleFollow = useCallback(
    (pubkey: string) => {
      toggleFollow(pubkey);
      mainToggleFollow(pubkey);
    },
    [toggleFollow, mainToggleFollow],
  );

  /**
   * Refresh feed: fetch posts from followed users only
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
    setSubscriptionActive(true);

    try {
      const followedArray = Array.from(followedPubkeys);

      // Close existing subscriptions
      relay.ws.send(JSON.stringify(["CLOSE", "following-feed"]));
      relay.ws.send(JSON.stringify(["CLOSE", "following-profiles"]));

      // Subscribe to recent text notes from followed users
      relay.ws.send(
        JSON.stringify([
          "REQ",
          "following-feed",
          {
            kinds: [1],
            authors: followedArray,
            limit: 100,
            since: Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60,
          },
        ]),
      );

      // Get profile metadata for followed users only
      relay.ws.send(
        JSON.stringify([
          "REQ",
          "following-profiles",
          {
            kinds: [0],
            authors: followedArray,
          },
        ]),
      );

      notification.success(`Refreshing feed from ${followedPubkeys.size} followed users...`);
    } catch (error) {
      console.error("Error refreshing feed:", error);
      notification.error("Failed to refresh feed");
      setLoading(false);
    }
  }, [relay.connected, relay.ws, followedPubkeys, setLoading, setSubscriptionActive]);

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

      relay.ws.send(JSON.stringify(["EVENT", signedEvent]));

      notification.success("Note published successfully!");
      setNewNote("");
      setShowPostForm(false);

      // Add to local feed if user follows themselves
      if (followedPubkeys.has(pubkey)) {
        setEvents(prev => [signedEvent, ...prev]);
      }
    } catch (error) {
      console.error("Error posting note:", error);
      notification.error("Failed to post note");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Following Feed</h1>
        <p className="text-base-content/70">Posts from users you follow</p>
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
          <h3 className="text-lg font-semibold mb-2">No Users Followed</h3>
          <p className="text-sm opacity-80 mb-4">
            Follow some users to see their posts in your feed. You can discover users through the main feed.
          </p>
          <Link href="/feed" className="btn btn-primary btn-sm">
            Explore Main Feed
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
            <p className="text-base-content/70 mb-4">No recent posts from followed users. Try refreshing the feed.</p>
            <button className="btn btn-primary" onClick={refreshFeed} disabled={!relay.connected}>
              <ArrowPathIcon className="w-4 h-4" />
              Refresh Feed
            </button>
          </div>
        ) : (
          events.map(event => (
            <EventCard
              key={event.id}
              event={event}
              author={authors.get(event.pubkey)}
              showFollowButton={true}
              onToggleFollow={handleToggleFollow}
              relayWs={relay.ws}
            />
          ))
        )}
      </div>
    </div>
  );
}
