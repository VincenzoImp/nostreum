"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { EyeIcon, LinkIcon, UserMinusIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { AuthorProfile } from "~~/types/nostreum";

interface AuthorInfoProps {
  pubkey: string;
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
 * Safe Image Component that handles external URLs
 */
const SafeImage = ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // If image failed to load or is loading, show fallback
  if (imageError || !src) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {imageLoading && <div className="absolute inset-0 bg-base-300 animate-pulse rounded-full" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`rounded-full object-cover w-full h-full ${imageLoading ? "opacity-0" : "opacity-100"}`}
        onLoad={() => setImageLoading(false)}
        onError={() => {
          setImageError(true);
          setImageLoading(false);
        }}
        loading="lazy"
      />
    </div>
  );
};

/**
 * AuthorInfo Component
 *
 * Displays author information with optional follow/unfollow functionality
 */
export const AuthorInfo = ({ pubkey, author, showFollowButton = true, onToggleFollow }: AuthorInfoProps) => {
  const ethereumAddress = useEthereumAddress(pubkey);

  const handleToggleFollow = useCallback(() => {
    if (onToggleFollow) {
      onToggleFollow(pubkey);
    }
  }, [pubkey, onToggleFollow]);

  const getInitials = () => {
    if (author?.name) {
      return author.name.slice(0, 2).toUpperCase();
    }
    return pubkey.slice(0, 2).toUpperCase();
  };

  const getDisplayName = () => {
    if (author?.name) {
      return author.name;
    }
    return `${pubkey.slice(0, 8)}...${pubkey.slice(-4)}`;
  };

  return (
    <div className="flex items-center gap-3 mb-2">
      <div className="avatar">
        <div className="w-10 h-10 rounded-full">
          {author?.picture ? (
            <SafeImage src={author.picture} alt="Avatar" className="w-10 h-10" />
          ) : (
            <div className="bg-primary text-primary-content flex items-center justify-center w-10 h-10 rounded-full">
              {getInitials()}
            </div>
          )}
          {!author?.picture && (
            <div className="bg-primary text-primary-content flex items-center justify-center w-10 h-10 rounded-full">
              {getInitials()}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{getDisplayName()}</span>

          {ethereumAddress && ethereumAddress !== "0x0000000000000000000000000000000000000000" && (
            <div className="flex items-center gap-1 text-xs bg-primary text-primary-content px-2 py-1 rounded-full">
              <LinkIcon className="w-3 h-3" />
              <span>ETH</span>
            </div>
          )}
        </div>
      </div>

      <Link href={`/profile/${pubkey}`} className="btn btn-ghost btn-xs">
        <EyeIcon className="w-3 h-3" />
        View
      </Link>

      {showFollowButton && onToggleFollow && (
        <button
          className={`btn btn-xs ${author?.isFollowed ? "btn-error" : "btn-primary"}`}
          onClick={handleToggleFollow}
        >
          {author?.isFollowed ? (
            <>
              <UserMinusIcon className="w-3 h-3" />
              Unfollow
            </>
          ) : (
            <>
              <UserPlusIcon className="w-3 h-3" />
              Follow
            </>
          )}
        </button>
      )}
    </div>
  );
};
