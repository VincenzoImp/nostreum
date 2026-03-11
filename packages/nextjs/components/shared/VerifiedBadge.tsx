"use client";

import { useLinkedAddress } from "~~/hooks/bridge/useLinkedAddress";
import { truncateAddress } from "~~/utils/nostr/formatting";

interface VerifiedBadgeProps {
  pubkey: string;
  showAddress?: boolean;
  className?: string;
}

export function VerifiedBadge({ pubkey, showAddress = false, className = "" }: VerifiedBadgeProps) {
  const { ethAddress, isLinked } = useLinkedAddress(pubkey);

  if (!isLinked) return null;

  return (
    <span
      className={`badge-verified inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-accent/15 text-accent text-xs font-semibold shrink-0 ${className}`}
      title={ethAddress ? `Verified: ${ethAddress}` : "ETH Verified"}
    >
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
      {showAddress && ethAddress && <span className="font-mono text-[10px]">{truncateAddress(ethAddress, 4)}</span>}
    </span>
  );
}
