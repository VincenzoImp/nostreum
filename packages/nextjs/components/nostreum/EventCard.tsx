"use client";

import { ChatBubbleLeftIcon, HeartIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { AuthorInfo } from "./AuthorInfo";
import { AuthorProfile, NostrEvent } from "~~/types/nostreum";

interface EventCardProps {
    event: NostrEvent;
    author?: AuthorProfile;
    showFollowButton?: boolean;
    onToggleFollow?: (pubkey: string) => void;
}

/**
 * Hook to read Ethereum address for a given Nostr pubkey
 */
const useEthereumAddress = (pubkey: string) => {
    const { data: ethereumAddress } = useScaffoldReadContract({
        contractName: "NostrLinkr",
        functionName: "pubkeyAddress",
        args: [pubkey ? `0x${pubkey}` : undefined],
    });
    return ethereumAddress;
};

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
        return `${diffMinutes}m ago`;
    }
};

/**
 * EventCard Component
 * 
 * Displays individual Nostr event/note with author info and interactions
 */
export const EventCard = ({ event, author, showFollowButton = true, onToggleFollow }: EventCardProps) => {
    const ethereumAddress = useEthereumAddress(event.pubkey);

    return (
        <div className="card bg-base-100 shadow-md mb-4">
            <div className="card-body p-4">
                <AuthorInfo
                    pubkey={event.pubkey}
                    author={author}
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
                    {ethereumAddress && ethereumAddress !== "0x0000000000000000000000000000000000000000" && (
                        <p>
                            <strong>Ethereum:</strong> <Address address={ethereumAddress} size="xs" />
                        </p>
                    )}
                </div>

                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-base-300">
                    <button className="btn btn-ghost btn-xs flex items-center gap-1">
                        <HeartIcon className="w-4 h-4" />
                        <span>Like</span>
                    </button>
                    <button className="btn btn-ghost btn-xs flex items-center gap-1">
                        <ChatBubbleLeftIcon className="w-4 h-4" />
                        <span>Reply</span>
                    </button>
                </div>
            </div>
        </div>
    );
};