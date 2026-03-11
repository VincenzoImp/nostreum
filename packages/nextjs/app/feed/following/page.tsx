"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ComposeModal } from "~~/components/feed/ComposeModal";
import { EventCard } from "~~/components/feed/EventCard";
import { FeedTabs } from "~~/components/feed/FeedTabs";
import { EmptyState } from "~~/components/shared/EmptyState";
import { SkeletonList } from "~~/components/shared/SkeletonCard";
import { useFollowingCtx } from "~~/contexts/FollowingContext";
import { useFeed } from "~~/hooks/nostr/useFeed";

export default function FollowingFeedPage() {
  const { followedPubkeys, followCount } = useFollowingCtx();
  const [composeOpen, setComposeOpen] = useState(false);

  const authors = useMemo(() => Array.from(followedPubkeys), [followedPubkeys]);
  const { events, loading } = useFeed(followCount > 0 ? { authors } : undefined);

  if (followCount === 0) {
    return (
      <div className="max-w-2xl mx-auto w-full">
        <FeedTabs />
        <EmptyState
          title="Not following anyone yet"
          description="Follow users from the Explore feed to see their posts here"
          icon={
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
              />
            </svg>
          }
          action={
            <Link href="/feed" className="btn btn-primary btn-sm rounded-full px-6">
              Explore Feed
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full">
      <FeedTabs />

      <div className="p-4 space-y-3">
        {loading ? (
          <SkeletonList count={5} />
        ) : events.length === 0 ? (
          <EmptyState title="No recent posts" description="Users you follow haven't posted in the last 7 days" />
        ) : (
          <>
            <div className="text-xs text-base-content/30 pb-1">
              Following {followCount} &middot; {events.length} {events.length === 1 ? "post" : "posts"}
            </div>
            {events.map(event => (
              <EventCard key={event.id} event={event} showFollowButton={false} />
            ))}
          </>
        )}
      </div>

      {/* Floating compose button */}
      <button
        onClick={() => setComposeOpen(true)}
        className="fixed bottom-24 md:bottom-8 right-6 w-14 h-14 rounded-full bg-primary text-primary-content shadow-[0_0_24px_-4px] shadow-primary/40 flex items-center justify-center hover:brightness-110 active:scale-95 transition-all z-20"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>

      <ComposeModal isOpen={composeOpen} onClose={() => setComposeOpen(false)} />
    </div>
  );
}
