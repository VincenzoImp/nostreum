"use client";

import { useCallback, useEffect, useState } from "react";
import { getEventHash } from "nostr-tools";
import { ArrowPathIcon, PlusIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { EventCard, NostrEvent } from "~~/components/nostreum/EventCard";
import { AuthorProfile } from "~~/components/nostreum/AuthorInfo";
import { useNostrConnection } from "~~/hooks/nostreum/useNostrConnection";
import { notification } from "~~/utils/scaffold-eth/notification";

/**
 * Following Feed Component
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
export default function FollowingFeed() {
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
    const [followedPubkeys, setFollowedPubkeys] = useState<Set<string>>(new Set());

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

    /**
     * Custom message handler for following feed (filters by followed users)
     */
    const followingFeedMessageHandler = useCallback(
        (message: any[]) => {
            const [type, subscriptionId, event] = message;

            if (type === "EVENT" && event.kind === 1) {
                // Only add text notes from followed users
                if (followedPubkeys.has(event.pubkey)) {
                    handleRelayMessage(message);
                }
            } else {
                // Handle other event types normally (like profiles)
                handleRelayMessage(message);
            }
        },
        [followedPubkeys, handleRelayMessage],
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
                    since: Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60, // Last 7 days
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
    }, [relay.connected, relay.ws, followedPubkeys, setEvents, setLoading, setSubscriptionActive]);

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
                setEvents(prev => [signedEvent, ...prev]);
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
                    followingFeedMessageHandler(message);
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
    }, [relay.connected, relay.ws, followingFeedMessageHandler]);

    return (
        <div className="max-w-2xl mx-auto p-4 space-y-6">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-3xl font-bold mb-2">👥 Following Feed</h1>
                <p className="text-base-content/70">Posts from users you follow • Manual refresh only</p>
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
                            onToggleFollow={toggleFollow}
                        />
                    ))
                )}
            </div>
        </div>
    );
}