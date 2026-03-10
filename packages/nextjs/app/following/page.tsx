"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { getEventHash } from "nostr-tools";
import { ArrowPathIcon, PlusIcon } from "@heroicons/react/24/outline";
import { EventCard } from "~~/components/nostreum/EventCard";
import { RelayStatus } from "~~/components/nostreum/RelayStatus";
import { useFollowing } from "~~/hooks/nostreum/useFollowing";
import { useNostrConnection } from "~~/hooks/nostreum/useNostrConnection";
import { NostrEvent } from "~~/types/nostreum";
import { notification } from "~~/utils/scaffold-eth/notification";

export default function FollowingPage() {
  const [, setTempAuthors] = useState<Map<string, import("~~/types/nostreum").AuthorProfile>>(new Map());
  const { followedPubkeys, toggleFollow } = useFollowing(setTempAuthors);

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

  const { toggleFollow: mainToggleFollow } = useFollowing(setAuthors);

  const [newNote, setNewNote] = useState("");
  const [showPostForm, setShowPostForm] = useState(false);

  const handleToggleFollow = useCallback(
    (pubkey: string) => {
      toggleFollow(pubkey);
      mainToggleFollow(pubkey);
    },
    [toggleFollow, mainToggleFollow],
  );

  const refreshFeed = useCallback(() => {
    if (!relay.connected || !relay.ws) {
      notification.error("Not connected to relay");
      return;
    }
    if (followedPubkeys.size === 0) {
      notification.info("Follow some users first!");
      return;
    }

    setLoading(true);
    setSubscriptionActive(true);
    const followedArray = Array.from(followedPubkeys);

    try {
      relay.ws.send(JSON.stringify(["CLOSE", "following-feed"]));
      relay.ws.send(JSON.stringify(["CLOSE", "following-profiles"]));
      relay.ws.send(
        JSON.stringify([
          "REQ",
          "following-feed",
          { kinds: [1], authors: followedArray, limit: 100, since: Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60 },
        ]),
      );
      relay.ws.send(JSON.stringify(["REQ", "following-profiles", { kinds: [0], authors: followedArray }]));
      notification.success(`Refreshing from ${followedPubkeys.size} followed users...`);
    } catch (error) {
      console.error("Error refreshing feed:", error);
      notification.error("Failed to refresh feed");
      setLoading(false);
    }
  }, [relay.connected, relay.ws, followedPubkeys, setLoading, setSubscriptionActive]);

  const postNote = async () => {
    if (!newNote.trim() || !window.nostr) {
      notification.error("Enter a note and ensure Nostr extension is available");
      return;
    }
    if (!relay.connected || !relay.ws) {
      notification.error("Not connected to relay");
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
        pubkey,
      };
      const eventWithId = { ...noteEvent, id: getEventHash(noteEvent) };
      const signedEvent = await window.nostr.signEvent(eventWithId);
      relay.ws.send(JSON.stringify(["EVENT", signedEvent]));
      notification.success("Note published!");
      setNewNote("");
      setShowPostForm(false);
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
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Following</h1>
        <p className="text-sm text-base-content/50">Posts from users you follow</p>
      </div>

      {/* Controls */}
      <div className="bg-base-100 rounded-2xl border border-base-300/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <RelayStatus relay={relay} maxReconnectAttempts={MAX_RECONNECT_ATTEMPTS} />
          <div className="flex items-center gap-2">
            <button
              className="btn btn-sm btn-primary gap-1"
              onClick={refreshFeed}
              disabled={loading || !relay.connected}
            >
              {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <ArrowPathIcon className="w-4 h-4" />}
              Refresh
            </button>
            <button
              className="btn btn-sm btn-outline gap-1"
              onClick={() => setShowPostForm(!showPostForm)}
              disabled={!relay.connected}
            >
              <PlusIcon className="w-4 h-4" />
              Post
            </button>
          </div>
        </div>

        {showPostForm && (
          <div className="space-y-3 pt-3 border-t border-base-300/30">
            <textarea
              className="textarea textarea-bordered w-full text-sm"
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
                {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : "Post"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-center">
        <div className="flex-1 bg-base-100 rounded-xl border border-base-300/50 p-3">
          <div className="text-lg font-bold">{followedPubkeys.size}</div>
          <div className="text-xs text-base-content/50">Following</div>
        </div>
        <div className="flex-1 bg-base-100 rounded-xl border border-base-300/50 p-3">
          <div className="text-lg font-bold">{events.length}</div>
          <div className="text-xs text-base-content/50">Posts</div>
        </div>
        <div className="flex-1 bg-base-100 rounded-xl border border-base-300/50 p-3">
          <div className={`text-lg font-bold ${subscriptionActive ? "text-success" : ""}`}>
            {subscriptionActive ? "Live" : "Idle"}
          </div>
          <div className="text-xs text-base-content/50">Status</div>
        </div>
      </div>

      {/* Empty state */}
      {followedPubkeys.size === 0 && (
        <div className="text-center py-10 bg-base-100 rounded-2xl border border-base-300/50">
          <h3 className="font-semibold mb-2">No Users Followed</h3>
          <p className="text-sm text-base-content/50 mb-4">Follow users from the main feed to see their posts here.</p>
          <Link href="/feed" className="btn btn-primary btn-sm">
            Explore Feed
          </Link>
        </div>
      )}

      {/* Feed */}
      <div className="space-y-3">
        {loading && events.length === 0 ? (
          <div className="text-center py-12">
            <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto mb-2 text-base-content/30" />
            <p className="text-sm text-base-content/50">Loading feed...</p>
          </div>
        ) : events.length === 0 && followedPubkeys.size > 0 ? (
          <div className="text-center py-8 bg-base-100 rounded-2xl border border-base-300/50">
            <p className="text-sm text-base-content/50 mb-3">No recent posts. Try refreshing.</p>
            <button className="btn btn-sm btn-primary" onClick={refreshFeed} disabled={!relay.connected}>
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
