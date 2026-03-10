"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { LinkIcon, UserMinusIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { AuthorProfile } from "~~/types/nostreum";

interface AuthorInfoProps {
  pubkey: string;
  author?: AuthorProfile;
  ethereumAddress?: string;
  showFollowButton?: boolean;
  onToggleFollow?: (pubkey: string) => void;
}

const SafeAvatar = ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (error || !src) return null;

  return (
    <div className={`relative ${className}`}>
      {loading && <div className="absolute inset-0 bg-base-300 animate-pulse rounded-full" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`rounded-full object-cover w-full h-full transition-opacity ${loading ? "opacity-0" : "opacity-100"}`}
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
        loading="lazy"
      />
    </div>
  );
};

export const AuthorInfo = ({
  pubkey,
  author,
  ethereumAddress,
  showFollowButton = true,
  onToggleFollow,
}: AuthorInfoProps) => {
  const handleToggleFollow = useCallback(() => {
    onToggleFollow?.(pubkey);
  }, [pubkey, onToggleFollow]);

  const initials = author?.name ? author.name.slice(0, 2).toUpperCase() : pubkey.slice(0, 2).toUpperCase();
  const displayName = author?.name || `${pubkey.slice(0, 8)}...${pubkey.slice(-4)}`;
  const hasEthLink = ethereumAddress && ethereumAddress !== "0x0000000000000000000000000000000000000000";

  return (
    <div className="flex items-center gap-3">
      <Link href={`/profile/${pubkey}`} className="shrink-0">
        <div className="w-10 h-10 rounded-full overflow-hidden">
          {author?.picture ? (
            <SafeAvatar src={author.picture} alt={displayName} className="w-10 h-10" />
          ) : (
            <div className="bg-gradient-to-br from-primary to-secondary text-primary-content flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold">
              {initials}
            </div>
          )}
        </div>
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link href={`/profile/${pubkey}`} className="font-semibold text-sm truncate hover:underline">
            {displayName}
          </Link>
          {hasEthLink && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-primary/15 text-primary px-1.5 py-0.5 rounded-full whitespace-nowrap">
              <LinkIcon className="w-2.5 h-2.5" />
              ETH
            </span>
          )}
        </div>
      </div>

      {showFollowButton && onToggleFollow && (
        <button
          className={`btn btn-xs gap-1 ${author?.isFollowed ? "btn-outline btn-error" : "btn-primary"}`}
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
