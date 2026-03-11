"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { NoteContent } from "./NoteContent";
import { Avatar } from "~~/components/shared/Avatar";
import { VerifiedBadge } from "~~/components/shared/VerifiedBadge";
import { useFollowingCtx } from "~~/contexts/FollowingContext";
import { useNostr } from "~~/contexts/NostrContext";
import { useProfileCache } from "~~/contexts/ProfileCacheContext";
import type { NostrEvent } from "~~/types/nostr";
import { formatTimestamp, truncatePubkey } from "~~/utils/nostr/formatting";

interface EventCardProps {
  event: NostrEvent;
  showFollowButton?: boolean;
}

export const EventCard = memo(function EventCard({ event, showFollowButton = true }: EventCardProps) {
  const { getProfile } = useProfileCache();
  const { isFollowing, toggleFollow } = useFollowingCtx();
  const { publish } = useNostr();
  const [liked, setLiked] = useState(false);

  const profile = getProfile(event.pubkey);
  const displayName = profile?.name || truncatePubkey(event.pubkey);
  const following = isFollowing(event.pubkey);

  const handleLike = async () => {
    if (liked || !window.nostr) return;
    try {
      const reactionEvent = {
        kind: 7,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ["e", event.id],
          ["p", event.pubkey],
        ],
        content: "+",
      };
      const signed = await window.nostr.signEvent(reactionEvent);
      const ok = await publish(signed);
      if (ok) setLiked(true);
    } catch {
      // ignore
    }
  };

  return (
    <article className="animate-fade-in glass-card-hover p-4">
      <div className="flex items-start gap-3">
        <Link href={`/profile/${event.pubkey}`} className="shrink-0">
          <Avatar src={profile?.picture} name={profile?.name} pubkey={event.pubkey} size="md" />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href={`/profile/${event.pubkey}`}
              className="font-semibold text-sm text-base-content truncate hover:text-primary transition-colors"
            >
              {displayName}
            </Link>
            <VerifiedBadge pubkey={event.pubkey} />
            <span className="text-xs text-base-content/30 shrink-0">{formatTimestamp(event.created_at)}</span>
            <div className="flex-1" />
            {showFollowButton && (
              <button
                onClick={() => toggleFollow(event.pubkey)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-all duration-200 ${
                  following
                    ? "bg-primary/8 text-primary border border-primary/20"
                    : "text-base-content/40 border border-base-300/50 hover:border-primary/30 hover:text-primary hover:bg-primary/5"
                }`}
              >
                {following ? "Following" : "Follow"}
              </button>
            )}
          </div>

          <NoteContent content={event.content} />

          <div className="flex items-center gap-1 mt-3">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all duration-200 ${
                liked ? "text-error bg-error/8" : "text-base-content/25 hover:text-error/60 hover:bg-error/5"
              }`}
            >
              <svg
                className="w-4 h-4"
                fill={liked ? "currentColor" : "none"}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                />
              </svg>
              {liked && <span>1</span>}
            </button>
            <button className="flex items-center gap-1.5 text-xs text-base-content/25 px-2.5 py-1.5 rounded-lg hover:text-primary/60 hover:bg-primary/5 transition-all duration-200">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
});
