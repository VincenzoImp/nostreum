"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLinkStatus } from "~~/hooks/bridge/useLinkStatus";
import { isEthAddress, isHexPubkey, truncatePubkey } from "~~/utils/nostr/formatting";

export default function ProfileSearchPage() {
  const router = useRouter();
  const { isLinked, linkedPubkey } = useLinkStatus();
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const handleSearch = () => {
    const trimmed = query.trim();
    if (isHexPubkey(trimmed) || isEthAddress(trimmed)) {
      router.push(`/profile/${trimmed}`);
    } else {
      setError("Enter a valid 64-character hex pubkey or 0x Ethereum address");
    }
  };

  return (
    <div className="max-w-xl mx-auto w-full px-4 sm:px-6 py-10 md:py-16">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight mb-3">Lookup Profile</h1>
        <p className="text-sm text-base-content/45">Search any Nostr user by public key or Ethereum address</p>
      </div>

      {isLinked && linkedPubkey && (
        <button
          onClick={() => router.push(`/profile/${linkedPubkey}`)}
          className="w-full mb-6 glass-card-hover p-4 text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary mb-0.5">Your linked profile</p>
              <p className="font-mono text-sm text-base-content/60 truncate">{truncatePubkey(linkedPubkey, 12)}</p>
            </div>
            <svg
              className="w-4 h-4 text-base-content/20 group-hover:text-primary transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        </button>
      )}

      <div className="glass-card p-5 space-y-4">
        <div className="relative">
          <svg
            className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-base-content/30"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setError("");
            }}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="npub, hex pubkey, or 0x address..."
            className="input input-bordered w-full pl-11 font-mono text-sm h-12"
          />
        </div>
        {error && (
          <p className="text-xs text-error flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            {error}
          </p>
        )}
        <button
          onClick={handleSearch}
          disabled={!query.trim()}
          className="btn btn-primary w-full rounded-xl h-12 disabled:opacity-30"
        >
          Search
        </button>
      </div>
    </div>
  );
}
