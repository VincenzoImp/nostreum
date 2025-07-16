"use client";

import { useCallback, useEffect, useState } from "react";
import { getEventHash } from "nostr-tools";
import { ArrowPathIcon, PlusIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { EventCard } from "~~/components/nostreum/EventCard";
import { useNostrConnection } from "~~/hooks/nostreum/useNostrConnection";
import { notification } from "~~/utils/scaffold-eth/notification";

/**
 * Main Feed Component
 *
 * A Nostr feed reader that shows posts from the network.
 * Features include:
 * - Manual refresh
 * - All public posts (not filtered)
 * - Profile viewing with follow/unfollow
 * - Posting new notes
 * - Safe relay connection handling
 */
export default function Feed() {
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
        handleRelayMessage,
        MAX_RECONNECT_ATTEMPTS,
    } = useNostrConnection();

    const [newNote, setNewNote] = useState("");
    const [showPostForm, setShowPostForm] = useState(false);
    const [, setFollowedPubkeys] = useState<Set<string>>(new Set());

    /**
     * Load following list from localStorage
     */
    useEffect(() => {
        try {
            const savedFollowing = localStorage.getItem("nostr-following");
            if (savedFollowing) {
                const followingArray = JSON.parse(savedFollowing);
                setFollowedPubkeys(new Set(followingArray));

                // Update authors with follow status
                setAuthors(prev => {
                    const newAuthors = new Map(prev);
                    followingArray.forEach((pubkey: string) => {
                        const author = newAuthors.get(pubkey);
                        if (author) {
                            newAuthors.set(pubkey, { ...author, isFollowed: true });
                        }
                    });
                    return newAuthors;
                });
            }
        } catch (error) {
            console.error("Error loading following list:", error);
        }
    }, [setAuthors]);

    /**
     * Custom message handler for main feed (accepts all events)
     */
    const mainFeedMessageHandler = useCallback(
        (message: any[]) => {
            handleRelayMessage(message); // No filtering, accept all events
        },
        [handleRelayMessage],
    );

    /**
     * Manual refresh function - fetches recent posts from the network
     */
    const refreshFeed = useCallback(() => {
        if (!relay.connected || !relay.ws) {
            notification.error("Not connected to relay. Please connect first.");
            return;
        }

        setLoading(true);
        setEvents([]);
        setSubscriptionActive(true);

        try {
            // Close existing subscriptions
            relay.ws.send(JSON.stringify(["CLOSE", "main-feed"]));
            relay.ws.send(JSON.stringify(["CLOSE", "main-profiles"]));

            // Subscribe to recent text notes from the network
            const subscriptionMessage = JSON.stringify([
                "REQ",
                "main-feed",
                {
                    kinds: [1],
                    limit: 100,
                    since: Math.floor(Date.now() / 1000) - 24 * 60 * 60, // Last 24 hours
                },
            ]);

            relay.ws.send(subscriptionMessage);

            // Get profile metadata for authors
            setTimeout(() => {
                if (relay.ws && relay.connected) {
                    const profileSubscription = JSON.stringify([
                        "REQ",
                        "main-profiles",
                        {
                            kinds: [0],
                            limit: 500,
                        },
                    ]);

                    relay.ws.send(profileSubscription);
                }
            }, 1000);

            notification.success("Refreshing main feed...");
        } catch (error) {
            console.error("Error refreshing feed:", error);
            notification.error("Failed to refresh feed");
            setLoading(false);
        }
    }, [relay.connected, relay.ws, setEvents, setLoading, setSubscriptionActive]);

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

            // Add to local feed immediately
            setEvents(prev => [signedEvent, ...prev]);
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
            const author = newAuthors.get(pubkey) || { pubkey, isFollowed: false };
            newAuthors.set(pubkey, {
                ...author,
                isFollowed: !author.isFollowed,
            });
            return newAuthors;
        });
    }, [setAuthors]);

    /**
     * Override connection to use custom message handler
     */
    useEffect(() => {
        if (relay.connected && relay.ws) {
            // Set up custom message handler
            const originalOnMessage = relay.ws.onmessage;
            relay.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    mainFeedMessageHandler(message);
                } catch (error) {
                    console.error("Error parsing relay message:", error);
                }
            };

            return () => {
                if (relay.ws) {
                    relay.ws.onmessage = originalOnMessage;
                }
            };
        }
    }, [relay.connected, relay.ws, mainFeedMessageHandler]);

    return (
        <div className="max-w-2xl mx-auto p-4 space-y-6">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-3xl font-bold mb-2">🦜 Social Feed</h1>
                <p className="text-base-content/70">Real-time posts from the Nostr network • Manual refresh</p>
            </div>

            {/* Connection status and controls */}
            <div className="card bg-base-200 shadow-md">
                <div className="card-body p-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div
                                className={`w-3 h-3 rounded-full ${relay.connected ? "bg-success" : relay.connecting ? "bg-warning animate-pulse" : "bg-error"
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
                    <div className="stat-title">Posts</div>
                    <div className="stat-value text-2xl">{events.length}</div>
                </div>
                <div className="stat">
                    <div className="stat-title">Authors</div>
                    <div className="stat-value text-2xl">{authors.size}</div>
                </div>
                <div className="stat">
                    <div className="stat-title">Status</div>
                    <div className="stat-value text-lg">{subscriptionActive ? "Active" : "Idle"}</div>
                </div>
            </div>

            {/* Instructions */}
            <div className="text-center py-4 bg-info/20 rounded-xl">
                <h3 className="text-lg font-semibold mb-2">🌐 Discover the Network</h3>
                <p className="text-sm opacity-80 mb-4">
                    Explore posts from across the Nostr network. Follow interesting users to add them to your{" "}
                    <Link href="/following-feed" className="link link-primary">
                        Following Feed
                    </Link>
                    .
                </p>
            </div>

            {/* Feed */}
            <div className="space-y-4">
                {loading && events.length === 0 ? (
                    <div className="text-center py-8">
                        <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto mb-2" />
                        <p>Loading feed...</p>
                    </div>
                ) : events.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-base-content/70 mb-4">No posts loaded yet. Click "Refresh Feed" to start exploring!</p>
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
                            onToggleFollow={toggleFollow}
                        />
                    ))
                )}
            </div>
        </div>
    );
}