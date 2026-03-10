"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Address } from "@scaffold-ui/components";
import { ArrowLeftIcon, ArrowPathIcon, LinkIcon, UserMinusIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { EventCard } from "~~/components/nostreum/EventCard";
import { RelayStatus } from "~~/components/nostreum/RelayStatus";
import { useNostrConnection } from "~~/hooks/nostreum/useNostrConnection";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { AuthorProfile, NostrEvent } from "~~/types/nostreum";
import { notification } from "~~/utils/scaffold-eth/notification";

export default function ProfileDetailPage() {
  const params = useParams();
  const pubkey = params.pubkey as string;

  const { loading, setLoading, relay } = useNostrConnection();

  const [userPosts, setUserPosts] = useState<NostrEvent[]>([]);
  const [profile, setProfile] = useState<AuthorProfile | null>(null);
  const [followedPubkeys, setFollowedPubkeys] = useState<Set<string>>(new Set());
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [postsLoaded, setPostsLoaded] = useState(false);

  const isMountedRef = useRef(true);
  const isValidPubkey = (key: string): boolean => !!key && /^[a-fA-F0-9]{64}$/.test(key.trim());

  const validPubkeyForContract = pubkey && isValidPubkey(pubkey) ? (`0x${pubkey}` as `0x${string}`) : undefined;
  const { data: ethereumAddress } = useScaffoldReadContract({
    contractName: "NostrLinkr",
    functionName: "pubkeyAddress",
    args: [validPubkeyForContract],
  });

  const hasEthLink = ethereumAddress && ethereumAddress !== "0x0000000000000000000000000000000000000000";

  // Load following list
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("nostr-following");
      if (saved) setFollowedPubkeys(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

  // Message handler
  const profileMessageHandler = useCallback(
    (message: any[]) => {
      if (!isMountedRef.current) return;
      const [type, subscriptionId, event] = message;

      if (type === "EVENT" && event) {
        if (event.kind === 0 && event.pubkey === pubkey) {
          try {
            const data = JSON.parse(event.content || "{}");
            setProfile({
              pubkey: event.pubkey,
              name: data.name || data.display_name,
              about: data.about,
              picture: data.picture,
              isFollowed: followedPubkeys.has(event.pubkey),
            });
          } catch {}
        } else if (event.kind === 1 && event.pubkey === pubkey) {
          setUserPosts(prev => {
            if (prev.some(e => e.id === event.id)) return prev;
            return [...prev, event].sort((a, b) => b.created_at - a.created_at);
          });
        }
      } else if (type === "EOSE") {
        if (subscriptionId === "user-profile") setProfileLoaded(true);
        if (subscriptionId === "user-posts") setPostsLoaded(true);
        setLoading(false);
      }
    },
    [pubkey, followedPubkeys, setLoading],
  );

  // Load profile
  const loadProfile = useCallback(() => {
    if (!relay.connected || !relay.ws || !pubkey || !isValidPubkey(pubkey)) return;

    setLoading(true);
    setUserPosts([]);
    setProfile(null);
    setProfileLoaded(false);
    setPostsLoaded(false);

    try {
      const ws = relay.ws;
      ws.send(JSON.stringify(["CLOSE", "user-profile"]));
      ws.send(JSON.stringify(["CLOSE", "user-posts"]));
      ws.send(JSON.stringify(["REQ", "user-profile", { kinds: [0], authors: [pubkey], limit: 1 }]));
      ws.send(JSON.stringify(["REQ", "user-posts", { kinds: [1], authors: [pubkey], limit: 50 }]));
    } catch (error) {
      console.error("Error loading profile:", error);
      notification.error("Failed to load profile");
      setLoading(false);
    }
  }, [relay.connected, relay.ws, pubkey, setLoading]);

  // Toggle follow
  const toggleFollow = useCallback(() => {
    if (!pubkey || typeof window === "undefined") return;
    const wasFollowed = followedPubkeys.has(pubkey);

    setFollowedPubkeys(prev => {
      const next = new Set(prev);
      if (wasFollowed) {
        next.delete(pubkey);
      } else {
        next.add(pubkey);
      }
      try {
        localStorage.setItem("nostr-following", JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });

    if (profile) setProfile(prev => (prev ? { ...prev, isFollowed: !wasFollowed } : null));
    notification.success(wasFollowed ? "Unfollowed" : "Following");
  }, [pubkey, profile, followedPubkeys]);

  // Wire up message handler
  useEffect(() => {
    if (!relay.connected || !relay.ws) return;
    const ws = relay.ws;
    const originalOnMessage = ws.onmessage;

    ws.onmessage = event => {
      try {
        profileMessageHandler(JSON.parse(event.data));
      } catch {}
    };

    return () => {
      if (ws) ws.onmessage = originalOnMessage;
    };
  }, [relay.connected, relay.ws, profileMessageHandler]);

  // Auto-load on connect
  useEffect(() => {
    if (pubkey && relay.connected && isValidPubkey(pubkey)) loadProfile();
  }, [pubkey, relay.connected, loadProfile]);

  // Cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  if (!pubkey || !isValidPubkey(pubkey)) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="text-error mb-4">Invalid pubkey format</p>
        <Link href="/profile" className="btn btn-primary btn-sm gap-1">
          <ArrowLeftIcon className="w-4 h-4" /> Back to Search
        </Link>
      </div>
    );
  }

  const displayName = profile?.name || `${pubkey.slice(0, 8)}...${pubkey.slice(-4)}`;
  const isFollowed = followedPubkeys.has(pubkey);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Nav */}
      <div className="flex items-center gap-3">
        <Link href="/profile" className="btn btn-ghost btn-sm gap-1">
          <ArrowLeftIcon className="w-4 h-4" /> Back
        </Link>
        <RelayStatus relay={relay} />
        <div className="flex-1" />
        <button className="btn btn-sm btn-outline gap-1" onClick={loadProfile} disabled={loading || !relay.connected}>
          {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <ArrowPathIcon className="w-4 h-4" />}
          Refresh
        </button>
      </div>

      {/* Profile Card */}
      <div className="bg-base-100 rounded-2xl border border-base-300/50 p-6">
        {loading && !profileLoaded ? (
          <div className="text-center py-8">
            <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto mb-2 text-base-content/30" />
            <p className="text-sm text-base-content/50">Loading profile...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden shrink-0">
                {profile?.picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.picture}
                    alt={displayName}
                    className="w-full h-full object-cover rounded-full"
                    onError={e => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="bg-gradient-to-br from-primary to-secondary text-primary-content flex items-center justify-center w-16 h-16 rounded-full text-lg font-bold">
                    {displayName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold truncate">{displayName}</h2>
                  {hasEthLink && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                      <LinkIcon className="w-3 h-3" /> ETH Verified
                    </span>
                  )}
                </div>
                <button
                  className={`btn btn-sm gap-1 mt-1 ${isFollowed ? "btn-outline btn-error" : "btn-primary"}`}
                  onClick={toggleFollow}
                >
                  {isFollowed ? (
                    <>
                      <UserMinusIcon className="w-4 h-4" /> Unfollow
                    </>
                  ) : (
                    <>
                      <UserPlusIcon className="w-4 h-4" /> Follow
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Bio */}
            {profile?.about && <p className="text-sm text-base-content/70 whitespace-pre-wrap">{profile.about}</p>}

            {/* Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-base-content/40 block mb-1">Public Key</span>
                <code className="text-[11px] bg-base-200 px-2 py-1 rounded break-all block">{pubkey}</code>
              </div>
              {hasEthLink && (
                <div>
                  <span className="text-xs text-base-content/40 block mb-1">Ethereum Address</span>
                  <Address address={ethereumAddress} size="sm" />
                </div>
              )}
            </div>

            {!profile && profileLoaded && (
              <div className="text-xs text-warning bg-warning/10 rounded-lg p-3">
                No profile metadata found. The user may not have published profile info on this relay.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-center">
        <div className="flex-1 bg-base-100 rounded-xl border border-base-300/50 p-3">
          <div className="text-lg font-bold">{userPosts.length}</div>
          <div className="text-xs text-base-content/50">Posts</div>
        </div>
        <div className="flex-1 bg-base-100 rounded-xl border border-base-300/50 p-3">
          <div className={`text-lg font-bold ${isFollowed ? "text-success" : ""}`}>
            {isFollowed ? "Following" : "Not Following"}
          </div>
          <div className="text-xs text-base-content/50">Status</div>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-3">
        <h3 className="font-semibold">Recent Posts</h3>
        {loading && !postsLoaded ? (
          <div className="text-center py-8">
            <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto mb-2 text-base-content/30" />
            <p className="text-sm text-base-content/50">Loading posts...</p>
          </div>
        ) : userPosts.length === 0 ? (
          <div className="text-center py-8 bg-base-100 rounded-2xl border border-base-300/50">
            <p className="text-sm text-base-content/50">No posts found.</p>
          </div>
        ) : (
          userPosts.map(event => (
            <EventCard
              key={event.id}
              event={event}
              author={profile || undefined}
              showFollowButton={false}
              relayWs={relay.ws}
            />
          ))
        )}
      </div>
    </div>
  );
}
