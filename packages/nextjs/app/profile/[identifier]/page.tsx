"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { EventCard } from "~~/components/feed/EventCard";
import { Avatar } from "~~/components/shared/Avatar";
import { EmptyState } from "~~/components/shared/EmptyState";
import { SkeletonList } from "~~/components/shared/SkeletonCard";
import { VerifiedBadge } from "~~/components/shared/VerifiedBadge";
import { useFollowingCtx } from "~~/contexts/FollowingContext";
import { useLinkedAddress } from "~~/hooks/bridge/useLinkedAddress";
import { useProfileDetail } from "~~/hooks/nostr/useProfileDetail";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { isEthAddress, isHexPubkey, isZeroPubkey, truncateAddress, truncatePubkey } from "~~/utils/nostr/formatting";

export default function ProfilePage({ params }: { params: Promise<{ identifier: string }> }) {
  const { identifier } = use(params);
  const isEth = isEthAddress(identifier);

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const { data: resolvedPubkey } = useScaffoldReadContract({
    contractName: "NostrLinkr",
    functionName: "addressPubkey",
    args: [isEth ? (identifier as `0x${string}`) : undefined],
  });

  const pubkey = useMemo(() => {
    if (isHexPubkey(identifier)) return identifier;
    if (isEth && resolvedPubkey && !isZeroPubkey(resolvedPubkey as string)) {
      return (resolvedPubkey as string).replace("0x", "");
    }
    return undefined;
  }, [identifier, isEth, resolvedPubkey]);

  const { profile, posts, loading } = useProfileDetail(pubkey);
  const { ethAddress, isLinked } = useLinkedAddress(pubkey);
  const { isFollowing, toggleFollow } = useFollowingCtx();

  const displayName = profile?.display_name || profile?.name || (pubkey ? truncatePubkey(pubkey) : "Unknown");
  const following = pubkey ? isFollowing(pubkey) : false;

  if (isEth && !pubkey) {
    return (
      <div className="max-w-2xl mx-auto w-full px-4 py-8">
        <EmptyState
          title="No linked Nostr identity"
          description={`Address ${truncateAddress(identifier)} has no linked Nostr public key`}
          action={
            <Link href="/bridge" className="btn btn-primary btn-sm rounded-full px-6">
              Bridge Identity
            </Link>
          }
        />
      </div>
    );
  }

  if (!pubkey) {
    return (
      <div className="max-w-2xl mx-auto w-full px-4 py-8">
        <EmptyState title="Invalid identifier" description="Enter a valid Nostr public key (hex) or Ethereum address" />
      </div>
    );
  }

  const hue = parseInt(pubkey.slice(0, 4), 16) % 360;

  return (
    <div className="max-w-2xl mx-auto w-full animate-fade-in">
      {/* Banner */}
      <div className="h-44 md:h-56 w-full relative overflow-hidden rounded-b-2xl">
        {profile?.banner ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profile.banner} alt="Profile banner" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-base-200/90 via-base-200/20 to-transparent" />
          </>
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, hsl(${hue}, 50%, 35%), hsl(${(hue + 60) % 360}, 50%, 25%))`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-base-200/80 to-transparent" />
          </>
        )}
      </div>

      {/* Profile Info */}
      <div className="px-4 sm:px-6 pb-6 -mt-14 relative">
        {/* Avatar + Follow */}
        <div className="flex items-end justify-between mb-5">
          <Avatar
            src={profile?.picture}
            name={profile?.name}
            pubkey={pubkey}
            size="xl"
            verified={isLinked}
            className="border-4 border-base-200 shadow-xl"
          />
          <div className="flex items-center gap-2">
            {/* Copy pubkey button */}
            <button
              onClick={() => copyToClipboard(pubkey, "pubkey")}
              className="btn btn-ghost btn-sm btn-square rounded-full text-base-content/50 hover:text-base-content"
              title="Copy public key"
            >
              {copiedField === "pubkey" ? (
                <svg
                  className="w-4 h-4 text-success"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              )}
            </button>
            {/* Follow/Unfollow */}
            <button
              onClick={() => toggleFollow(pubkey)}
              className={`btn btn-sm rounded-full px-6 font-semibold transition-all ${
                following
                  ? "btn-outline border-primary/30 text-primary hover:bg-primary/5"
                  : "btn-primary shadow-[0_0_12px_-2px] shadow-primary/20"
              }`}
            >
              {following ? "Following" : "Follow"}
            </button>
          </div>
        </div>

        {/* Name + Verified + NIP-05 */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold tracking-tight">{displayName}</h1>
            <VerifiedBadge pubkey={pubkey} showAddress />
          </div>
          {profile?.nip05 && <p className="text-sm text-primary font-medium">{profile.nip05}</p>}
          <div className="flex items-center gap-1.5 mt-1">
            <p className="font-mono text-xs text-base-content/30">{truncatePubkey(pubkey, 16)}</p>
          </div>
        </div>

        {/* Linked Ethereum Address */}
        {isLinked && ethAddress && (
          <button
            onClick={() => copyToClipboard(ethAddress, "eth")}
            className="glass-card inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-accent hover:bg-accent/10 transition-colors mb-4 cursor-pointer"
            title="Copy Ethereum address"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.061a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.25 8.832"
              />
            </svg>
            <span className="font-mono">{truncateAddress(ethAddress)}</span>
            {copiedField === "eth" ? (
              <svg
                className="w-3 h-3 text-success"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            )}
          </button>
        )}

        {/* Bio / About */}
        {profile?.about && (
          <div className="glass-card rounded-xl p-4 mb-4">
            <p className="text-sm text-base-content/70 whitespace-pre-wrap leading-relaxed">{profile.about}</p>
          </div>
        )}

        {/* Website + Lightning */}
        {(profile?.website || profile?.lud16) && (
          <div className="glass-card rounded-xl p-4 mb-4 flex flex-col gap-2.5">
            {profile.website && (
              <a
                href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors truncate"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
                <span className="truncate">{profile.website.replace(/^https?:\/\//, "")}</span>
              </a>
            )}
            {profile.lud16 && (
              <div className="inline-flex items-center gap-2 text-sm text-base-content/60">
                <svg
                  className="w-4 h-4 shrink-0 text-warning"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="font-mono text-xs truncate">{profile.lud16}</span>
              </div>
            )}
          </div>
        )}

        {/* Stats Bar */}
        <div className="flex items-center gap-4 text-sm border-b border-base-300/30 pb-4 mb-6">
          <div>
            <span className="font-bold">{posts.length}</span>{" "}
            <span className="text-base-content/40">{posts.length === 1 ? "post" : "posts"}</span>
          </div>
          {isLinked && (
            <div className="flex items-center gap-1.5 text-accent text-xs font-semibold">
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0L9.79 2.09L12.5 1.5L12.63 4.26L15.12 5.5L13.77 7.88L15.12 10.5L12.63 11.74L12.5 14.5L9.79 13.91L8 16L6.21 13.91L3.5 14.5L3.37 11.74L0.88 10.5L2.23 7.88L0.88 5.5L3.37 4.26L3.5 1.5L6.21 2.09L8 0Z" />
                <path
                  d="M6.5 8.5L7.5 9.5L10 7"
                  fill="none"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Verified
            </div>
          )}
        </div>
      </div>

      {/* Posts */}
      <div className="px-4 sm:px-6 pb-10">
        <h2 className="text-lg font-extrabold mb-4">
          Posts{" "}
          {!loading && posts.length > 0 && (
            <span className="text-base-content/30 font-normal text-sm ml-1">{posts.length}</span>
          )}
        </h2>
        <div className="space-y-3">
          {loading ? (
            <SkeletonList count={3} />
          ) : posts.length === 0 ? (
            <EmptyState title="No posts" description="This user hasn't posted anything yet" />
          ) : (
            posts.map(event => <EventCard key={event.id} event={event} showFollowButton={false} />)
          )}
        </div>
      </div>
    </div>
  );
}
