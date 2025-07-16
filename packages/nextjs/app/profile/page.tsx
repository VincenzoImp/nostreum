"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, MagnifyingGlassIcon, UserIcon } from "@heroicons/react/24/outline";
import { notification } from "~~/utils/scaffold-eth/notification";

/**
 * Profile Search Page
 *
 * Interface to search for Nostr profiles by pubkey
 * Redirects to individual profile pages when valid pubkey is entered
 */
export default function ProfileSearch() {
  const [pubkey, setPubkey] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const router = useRouter();

  /**
   * Validate if the pubkey is in the correct format
   */
  const isValidPubkey = (key: string): boolean => {
    // Remove any whitespace
    const cleanKey = key.trim();

    // Check if it's a valid hex string (64 characters)
    if (cleanKey.length === 64 && /^[a-fA-F0-9]{64}$/.test(cleanKey)) {
      return true;
    }

    // Check if it's a npub format (bech32)
    if (cleanKey.startsWith("npub") && cleanKey.length === 63) {
      return true;
    }

    return false;
  };

  /**
   * Convert npub to hex format if needed
   */
  const convertToHex = (key: string): string => {
    const cleanKey = key.trim();

    // If already hex, return as is
    if (/^[a-fA-F0-9]{64}$/.test(cleanKey)) {
      return cleanKey;
    }

    // If npub format, we'll let the profile page handle the conversion
    // For now, just return the original key
    return cleanKey;
  };

  /**
   * Handle form submission
   */
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pubkey.trim()) {
      notification.error("Please enter a pubkey");
      return;
    }

    if (!isValidPubkey(pubkey)) {
      notification.error("Invalid pubkey format. Please enter a valid hex pubkey (64 chars) or npub address");
      return;
    }

    setIsValidating(true);

    try {
      const hexPubkey = convertToHex(pubkey);

      // Navigate to the profile page
      router.push(`/profile/${hexPubkey}`);
    } catch (error) {
      console.error("Error processing pubkey:", error);
      notification.error("Error processing pubkey");
    } finally {
      setIsValidating(false);
    }
  };

  /**
   * Handle input change
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPubkey(value);
  };

  /**
   * Example pubkeys for demonstration
   */
  const examplePubkeys = [
    {
      name: "Example User 1",
      pubkey: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
      description: "A sample Nostr user",
    },
    {
      name: "Example User 2",
      pubkey: "82341f882b6eabcd2ba7f1ef90aad961cf074af15b9ef44a09f9d2a8fbfbe6a2",
      description: "Another sample profile",
    },
  ];

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">🔍 Profile Search</h1>
        <p className="text-base-content/70">Search for Nostr profiles by public key</p>
      </div>

      {/* Search Form */}
      <div className="card bg-base-200 shadow-md">
        <div className="card-body p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Nostr Public Key</span>
              </label>
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Enter hex pubkey (64 chars) or npub address..."
                  className="input input-bordered flex-1"
                  value={pubkey}
                  onChange={handleInputChange}
                  disabled={isValidating}
                />
                <button type="submit" className="btn btn-primary" disabled={isValidating || !pubkey.trim()}>
                  {isValidating ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <>
                      <MagnifyingGlassIcon className="w-4 h-4" />
                      Search
                    </>
                  )}
                </button>
              </div>
              <div className="label">
                <span className="label-text-alt text-info">
                  {pubkey.trim() &&
                    (isValidPubkey(pubkey) ? (
                      <span className="text-success">✓ Valid pubkey format</span>
                    ) : (
                      <span className="text-error">✗ Invalid pubkey format</span>
                    ))}
                </span>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Format Information */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body p-4">
          <h3 className="text-lg font-semibold mb-3">📋 Supported Formats</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="badge badge-primary badge-sm mt-1">HEX</div>
              <div>
                <p className="font-medium">Hexadecimal Public Key</p>
                <p className="text-sm text-base-content/70">64-character hexadecimal string</p>
                <code className="text-xs bg-base-200 px-2 py-1 rounded">
                  3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d
                </code>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="badge badge-secondary badge-sm mt-1">NPUB</div>
              <div>
                <p className="font-medium">Bech32 Public Key</p>
                <p className="text-sm text-base-content/70">Starts with 'npub' followed by bech32 encoding</p>
                <code className="text-xs bg-base-200 px-2 py-1 rounded">
                  npub1x0xxv07tjrhnsj7rkm5ee6ra3skctdx5x9ksgh4c4j9xrkeafc5dqmxg05
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Example Profiles */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body p-4">
          <h3 className="text-lg font-semibold mb-3">👤 Try Example Profiles</h3>
          <div className="space-y-2">
            {examplePubkeys.map((example, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium">{example.name}</p>
                  <p className="text-sm text-base-content/70">{example.description}</p>
                  <code className="text-xs text-base-content/60">
                    {example.pubkey.slice(0, 16)}...{example.pubkey.slice(-8)}
                  </code>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setPubkey(example.pubkey);
                    router.push(`/profile/${example.pubkey}`);
                  }}
                >
                  <ArrowRightIcon className="w-4 h-4" />
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="text-center py-4 bg-info/20 rounded-xl">
        <h3 className="text-lg font-semibold mb-2">🌟 Discover Profiles</h3>
        <p className="text-sm opacity-80 mb-4">
          Enter a Nostr public key to view someone's profile, posts, and metadata. You can follow users to add them to
          your personal feed.
        </p>
        <div className="flex items-center justify-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <UserIcon className="w-4 h-4" />
            View Profile Info
          </div>
          <div className="flex items-center gap-1">
            <MagnifyingGlassIcon className="w-4 h-4" />
            Browse Posts
          </div>
        </div>
      </div>
    </div>
  );
}
