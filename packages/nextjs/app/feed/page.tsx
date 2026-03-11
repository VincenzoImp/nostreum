"use client";

import { useState } from "react";
import { ComposeModal } from "~~/components/feed/ComposeModal";
import { EventCard } from "~~/components/feed/EventCard";
import { FeedTabs } from "~~/components/feed/FeedTabs";
import { EmptyState } from "~~/components/shared/EmptyState";
import { SkeletonList } from "~~/components/shared/SkeletonCard";
import { useFeed } from "~~/hooks/nostr/useFeed";

export default function FeedPage() {
  const { events, loading } = useFeed();
  const [composeOpen, setComposeOpen] = useState(false);

  return (
    <div className="max-w-2xl mx-auto w-full">
      <FeedTabs />

      <div className="p-4 space-y-3">
        {loading ? (
          <SkeletonList count={5} />
        ) : events.length === 0 ? (
          <EmptyState title="No posts yet" description="Connect to a relay to see posts from the Nostr network" />
        ) : (
          <>
            <div className="text-xs text-base-content/30 pb-1">
              {events.length} {events.length === 1 ? "post" : "posts"}
            </div>
            {events.map(event => (
              <EventCard key={event.id} event={event} />
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
