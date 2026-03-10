"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { getEventHash } from "nostr-tools";
import { ArrowPathIcon, PlusIcon } from "@heroicons/react/24/outline";
import { EventCard } from "~~/components/nostreum/EventCard";
import { RelayStatus } from "~~/components/nostreum/RelayStatus";
import { useFollowing } from "~~/hooks/nostreum/useFollowing";
import { useNostrConnection } from "~~/hooks/nostreum/useNostrConnection";
import { notification } from "~~/utils/scaffold-eth/notification";

export default function FeedPage() {
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
  } = useNostrConnection();

  const { toggleFollow } = useFollowing(setAuthors);

  const [newNote, setNewNote] = useState("");
  const [showPostForm, setShowPostForm] = useState(false);
  const receivedAuthorsRef = useRef<Set<string>>(new Set());

  const refreshFeed = useCallback(() => {
    if (!relay.connected || !relay.ws) {
      notification.error("Not connected to relay");
      return;
    }

    setLoading(true);
    setSubscriptionActive(true);
    receivedAuthorsRef.current = new Set();

    const ws = relay.ws;
    const originalOnMessage = ws.onmessage;

    ws.onmessage = (wsEvent: MessageEvent) => {
      try {
        const message = JSON.parse(wsEvent.data);
        const [type, , event] = message;

        if (type === "EVENT" && event?.kind === 1) {
          receivedAuthorsRef.current.add(event.pubkey);
        }

        if (type === "EOSE" && message[1] === "main-feed") {
          const authorPubkeys = Array.from(receivedAuthorsRef.current);
          if (authorPubkeys.length > 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(["CLOSE", "main-profiles"]));
            ws.send(JSON.stringify(["REQ", "main-profiles", { kinds: [0], authors: authorPubkeys }]));
          }
        }

        if (originalOnMessage) {
          originalOnMessage.call(ws, wsEvent);
        }
      } catch (error) {
        console.error("Error parsing relay message:", error);
      }
    };

    try {
      ws.send(JSON.stringify(["CLOSE", "main-feed"]));
      ws.send(JSON.stringify(["CLOSE", "main-profiles"]));
      ws.send(
        JSON.stringify([
          "REQ",
          "main-feed",
          { kinds: [1], limit: 100, since: Math.floor(Date.now() / 1000) - 24 * 60 * 60 },
        ]),
      );
      notification.success("Refreshing feed...");
    } catch (error) {
      console.error("Error refreshing feed:", error);
      notification.error("Failed to refresh feed");
      setLoading(false);
    }
  }, [relay.connected, relay.ws, setLoading, setSubscriptionActive]);

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
      setEvents(prev => [signedEvent, ...prev]);
    } catch (error) {
      console.error("Error posting note:", error);
      notification.error("Failed to post note");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Feed</h1>
        <p className="text-sm text-base-content/50">Real-time posts from the Nostr network</p>
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
          <div className="text-lg font-bold">{events.length}</div>
          <div className="text-xs text-base-content/50">Posts</div>
        </div>
        <div className="flex-1 bg-base-100 rounded-xl border border-base-300/50 p-3">
          <div className="text-lg font-bold">{authors.size}</div>
          <div className="text-xs text-base-content/50">Authors</div>
        </div>
        <div className="flex-1 bg-base-100 rounded-xl border border-base-300/50 p-3">
          <div className={`text-lg font-bold ${subscriptionActive ? "text-success" : ""}`}>
            {subscriptionActive ? "Live" : "Idle"}
          </div>
          <div className="text-xs text-base-content/50">Status</div>
        </div>
      </div>

      {/* Info */}
      {events.length === 0 && !loading && (
        <div className="text-center py-6 bg-base-100 rounded-2xl border border-base-300/50">
          <p className="text-sm text-base-content/50 mb-3">
            Click &quot;Refresh&quot; to load posts. Follow users to see them in your{" "}
            <Link href="/following" className="link link-primary">
              Following Feed
            </Link>
            .
          </p>
          <button className="btn btn-sm btn-primary" onClick={refreshFeed} disabled={!relay.connected}>
            Load Feed
          </button>
        </div>
      )}

      {/* Feed */}
      <div className="space-y-3">
        {loading && events.length === 0 ? (
          <div className="text-center py-12">
            <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto mb-2 text-base-content/30" />
            <p className="text-sm text-base-content/50">Loading feed...</p>
          </div>
        ) : (
          events.map(event => (
            <EventCard
              key={event.id}
              event={event}
              author={authors.get(event.pubkey)}
              showFollowButton={true}
              onToggleFollow={toggleFollow}
              relayWs={relay.ws}
            />
          ))
        )}
      </div>
    </div>
  );
}
