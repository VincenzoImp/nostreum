"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth/notification";

export default function ProfileSearchPage() {
  const router = useRouter();
  const { address } = useAccount();
  const [searchInput, setSearchInput] = useState("");

  const { data: myLinkedPubkey } = useScaffoldReadContract({
    contractName: "NostrLinkr",
    functionName: "addressPubkey",
    args: [address],
  });

  const isValidPubkey = (key: string): boolean => /^[a-fA-F0-9]{64}$/.test(key.trim());

  const handleSearch = () => {
    const input = searchInput.trim();
    if (!input) {
      notification.error("Enter a Nostr public key");
      return;
    }
    if (!isValidPubkey(input)) {
      notification.error("Invalid pubkey format. Must be 64 hex characters.");
      return;
    }
    router.push(`/profile/${input}`);
  };

  const handleViewMyProfile = () => {
    if (myLinkedPubkey && myLinkedPubkey !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
      const cleanPubkey = myLinkedPubkey.replace("0x", "");
      router.push(`/profile/${cleanPubkey}`);
    } else {
      notification.info("No Nostr pubkey linked. Link your identity first.");
    }
  };

  const hasLink =
    myLinkedPubkey && myLinkedPubkey !== "0x0000000000000000000000000000000000000000000000000000000000000000";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Profiles</h1>
        <p className="text-sm text-base-content/50">Search for Nostr users by public key</p>
      </div>

      {/* Search */}
      <div className="bg-base-100 rounded-2xl border border-base-300/50 p-5">
        <div className="flex gap-2">
          <input
            type="text"
            className="input input-bordered flex-1 text-sm font-mono"
            placeholder="Enter 64-character hex pubkey..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
          />
          <button className="btn btn-primary gap-1" onClick={handleSearch}>
            <MagnifyingGlassIcon className="w-4 h-4" />
            Search
          </button>
        </div>
      </div>

      {/* My Profile */}
      {address && (
        <div className="bg-base-100 rounded-2xl border border-base-300/50 p-5">
          <h2 className="font-semibold mb-3">My Profile</h2>
          {hasLink ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-base-content/50">Linked Nostr Pubkey:</span>
                <code className="text-xs font-mono text-primary">
                  {myLinkedPubkey?.slice(0, 12)}...{myLinkedPubkey?.slice(-8)}
                </code>
              </div>
              <button className="btn btn-sm btn-primary" onClick={handleViewMyProfile}>
                View My Profile
              </button>
            </div>
          ) : (
            <p className="text-sm text-base-content/50">
              No Nostr identity linked yet. Use the Identity Bridge on the home page to link your accounts.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
