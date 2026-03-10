"use client";

import { AuthorInfo } from "./AuthorInfo";
import { ChatBubbleLeftIcon, HeartIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
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

/**
 * Format timestamp for display
 */
const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays}d ago`;
  } else if (diffHours > 0) {
    return `${diffHours}h ago`;
  } else {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return diffMinutes <= 0 ? "just now" : `${diffMinutes}m ago`;
  }
};

/**
 * EventCard Component
 *
 * Displays individual Nostr event/note with author info and interactions.
 * Uses a single useEthereumAddress call and passes it to AuthorInfo to avoid double RPC.
 */
export const EventCard = ({ event, author, showFollowButton = true, onToggleFollow, relayWs }: EventCardProps) => {
  const ethereumAddress = useEthereumAddress(event.pubkey);

  const hasEthLink = ethereumAddress && ethereumAddress !== "0x0000000000000000000000000000000000000000";

  /**
   * Send a NIP-25 reaction (like) to the relay
   */
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

  /**
   * Reply to a post (placeholder - shows notification for now)
   */
  const handleReply = () => {
    if (!window.nostr) {
      notification.error("Nostr extension required to reply");
      return;
    }
    if (!relayWs || relayWs.readyState !== WebSocket.OPEN) {
      notification.error("Not connected to relay");
      return;
    }
    notification.info("Reply feature coming soon - use the post form to share your thoughts!");
  };

  return (
    <div className="card bg-base-100 shadow-md mb-4">
      <div className="card-body p-4">
        <AuthorInfo
          pubkey={event.pubkey}
          author={author}
          ethereumAddress={ethereumAddress}
          showFollowButton={showFollowButton}
          onToggleFollow={onToggleFollow}
        />

        <div className="text-sm mb-3">
          <p className="whitespace-pre-wrap break-words">{event.content}</p>
        </div>

        <div className="text-xs text-base-content/50 space-y-1">
          <p>
            <strong>Created:</strong> {formatTimestamp(event.created_at)}
          </p>
          <p>
            <strong>Event ID:</strong> {event.id.slice(0, 16)}...
          </p>
          {hasEthLink && (
            <p>
              <strong>Ethereum:</strong> <Address address={ethereumAddress} size="xs" />
            </p>
          )}
        </div>

        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-base-300">
          <button className="btn btn-ghost btn-xs flex items-center gap-1" onClick={handleLike}>
            <HeartIcon className="w-4 h-4" />
            <span>Like</span>
          </button>
          <button className="btn btn-ghost btn-xs flex items-center gap-1" onClick={handleReply}>
            <ChatBubbleLeftIcon className="w-4 h-4" />
            <span>Reply</span>
          </button>
        </div>
      </div>
    </div>
  );
};
