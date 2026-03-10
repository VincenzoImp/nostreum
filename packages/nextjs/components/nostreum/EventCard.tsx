"use client";

import { AuthorInfo } from "./AuthorInfo";
import { ChatBubbleLeftIcon, HeartIcon } from "@heroicons/react/24/outline";
import { useEthereumAddress } from "~~/hooks/nostreum/useEthereumAddress";
import { AuthorProfile, NostrEvent } from "~~/types/nostreum";
import { notification } from "~~/utils/scaffold-eth/notification";

interface EventCardProps {
  event: NostrEvent;
  author?: AuthorProfile;
  showFollowButton?: boolean;
  onToggleFollow?: (pubkey: string) => void;
  relayWs?: WebSocket | null;
}

const formatTimestamp = (timestamp: number) => {
  const diffMs = Date.now() - timestamp * 1000;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return "just now";
};

export const EventCard = ({ event, author, showFollowButton = true, onToggleFollow, relayWs }: EventCardProps) => {
  const ethereumAddress = useEthereumAddress(event.pubkey);

  const handleLike = async () => {
    if (!window.nostr) {
      notification.error("Nostr extension required to react");
      return;
    }
    if (!relayWs || relayWs.readyState !== WebSocket.OPEN) {
      notification.error("Not connected to relay");
      return;
    }
    try {
      const pubkey = await window.nostr.getPublicKey();
      const reactionEvent = {
        kind: 7,
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ["e", event.id],
          ["p", event.pubkey],
        ],
        content: "+",
        pubkey,
      };
      const { getEventHash } = await import("nostr-tools");
      const eventWithId = { ...reactionEvent, id: getEventHash(reactionEvent) };
      const signedEvent = await window.nostr.signEvent(eventWithId);
      relayWs.send(JSON.stringify(["EVENT", signedEvent]));
      notification.success("Reaction sent!");
    } catch (error) {
      console.error("Error sending reaction:", error);
      notification.error("Failed to send reaction");
    }
  };

  return (
    <div className="bg-base-100 rounded-2xl border border-base-300/50 p-5 transition-shadow hover:shadow-md">
      <AuthorInfo
        pubkey={event.pubkey}
        author={author}
        ethereumAddress={ethereumAddress}
        showFollowButton={showFollowButton}
        onToggleFollow={onToggleFollow}
      />

      <div className="mt-3 ml-[52px]">
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{event.content}</p>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-base-300/30">
          <span className="text-xs text-base-content/40">{formatTimestamp(event.created_at)}</span>

          <div className="flex items-center gap-1">
            <button className="btn btn-ghost btn-xs gap-1 text-base-content/50 hover:text-error" onClick={handleLike}>
              <HeartIcon className="w-3.5 h-3.5" />
            </button>
            <button
              className="btn btn-ghost btn-xs gap-1 text-base-content/50 hover:text-primary"
              onClick={() => notification.info("Reply feature coming soon")}
            >
              <ChatBubbleLeftIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
