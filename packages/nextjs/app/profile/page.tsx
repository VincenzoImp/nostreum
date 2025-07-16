"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, MagnifyingGlassIcon, UserIcon } from "@heroicons/react/24/outline";
import { bech32 } from '@scure/base';
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth/notification";

/**
 * Profile Search Page
 *
 * Interface to search for Nostr profiles by:
 * - Hexadecimal public key (64 chars)
 * - npub format (bech32)
 * - Ethereum address (links to pubkey via contract)
 */
export default function ProfileSearch() {
  const [searchInput, setSearchInput] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [searchType, setSearchType] = useState<"unknown" | "hex" | "npub" | "ethereum">("unknown");
  const [debouncedEthAddress, setDebouncedEthAddress] = useState<string | undefined>(undefined);
  const router = useRouter();

  // Debounce Ethereum address to prevent constant contract calls
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchType === "ethereum" && searchInput.trim()) {
        setDebouncedEthAddress(searchInput.trim());
      } else {
        setDebouncedEthAddress(undefined);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [searchInput, searchType]);

  // Contract read for Ethereum address lookup - only when debounced
  const { data: linkedPubkey, isLoading: contractLoading } = useScaffoldReadContract({
    contractName: "NostrLinkr",
    functionName: "addressPubkey",
    args: [debouncedEthAddress],
    watch: false, // Disable automatic watching to prevent constant calls
  });

  /**
   * Detect the type of input provided
   */
  const detectInputType = (input: string): "hex" | "npub" | "ethereum" | "unknown" => {
    const cleanInput = input.trim();

    if (!cleanInput) return "unknown";

    // Check if it's a valid hex string (64 characters)
    if (cleanInput.length === 64 && /^[a-fA-F0-9]{64}$/.test(cleanInput)) {
      return "hex";
    }

    // Check if it's a npub format (bech32)
    if (cleanInput.startsWith("npub") && cleanInput.length === 63) {
      return "npub";
    }

    // Check if it's an Ethereum address
    if (/^0x[a-fA-F0-9]{40}$/i.test(cleanInput)) {
      return "ethereum";
    }

    return "unknown";
  };

  /**
   * Convert npub to hex format using @scure/base library
   */
  const npubToHex = (npub: string): string => {
    try {
      // Validate npub format
      if (!npub.startsWith('npub') || npub.length !== 63) {
        throw new Error('Invalid npub format - must start with "npub" and be 63 characters long');
      }

      // Ensure npub is in bech32 format: `${string}1${string}`
      // npub should start with 'npub1', so we check and fix if needed
      let bech32Input = npub;
      if (!npub.startsWith("npub1")) {
        throw new Error('Invalid npub format - must start with "npub1"');
      }
      const { words } = bech32.decode(bech32Input as `${string}1${string}`, 90); // 90 is max length for bech32
      const bytes = bech32.fromWords(words);

      // Should be exactly 32 bytes for a pubkey
      if (bytes.length !== 32) {
        throw new Error(`Invalid pubkey length: expected 32 bytes, got ${bytes.length}`);
      }

      // Convert bytes to hex string
      return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (error) {
      console.error("Error converting npub to hex:", error);
      const errorMessage = typeof error === "object" && error !== null && "message" in error
        ? (error as { message: string }).message
        : String(error);
      throw new Error(`Invalid npub format: ${errorMessage}`);
    }
  };

  /**
   * Convert input to hex pubkey based on type
   */
  const convertToHexPubkey = async (input: string, type: string): Promise<string> => {
    const cleanInput = input.trim();

    switch (type) {
      case "hex":
        return cleanInput;

      case "npub":
        return npubToHex(cleanInput);

      case "ethereum":
        // Check if we have a linked pubkey from the contract
        if (linkedPubkey && linkedPubkey !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
          // Remove 0x prefix and return
          return linkedPubkey.slice(2);
        } else {
          // Return all zeros pubkey for fallback
          return "0000000000000000000000000000000000000000000000000000000000000000";
        }

      default:
        throw new Error("Unknown input type");
    }
  };

  /**
   * Handle form submission
   */
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchInput.trim()) {
      notification.error("Please enter a search term");
      return;
    }

    const inputType = detectInputType(searchInput);

    if (inputType === "unknown") {
      notification.error("Invalid format. Please enter a valid hex pubkey (64 chars), npub address, or Ethereum address");
      return;
    }

    setIsValidating(true);

    try {
      // For Ethereum addresses, ensure we have the contract result
      if (inputType === "ethereum") {
        if (contractLoading) {
          notification.info("Looking up linked pubkey...");
          // Wait for contract call to complete
          let attempts = 0;
          while (contractLoading && attempts < 10) {
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
          }
        }
      }

      const hexPubkey = await convertToHexPubkey(searchInput, inputType);

      // Check if we should redirect to fallback
      if (hexPubkey === "0000000000000000000000000000000000000000000000000000000000000000") {
        router.push(`/profile/fallback?reason=no_link&input=${encodeURIComponent(searchInput)}`);
      } else {
        // Navigate to the profile page
        router.push(`/profile/${hexPubkey}`);
      }
    } catch (error) {
      console.error("Error processing search input:", error);
      const errorMessage = typeof error === "object" && error !== null && "message" in error
        ? (error as { message: string }).message
        : String(error);
      notification.error(`Error processing search input: ${errorMessage}`);

      // Redirect to fallback with error info
      router.push(`/profile/fallback?reason=invalid_pubkey&input=${encodeURIComponent(searchInput)}`);
    } finally {
      setIsValidating(false);
    }
  };

  /**
   * Handle input change and detect type
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    const newType = detectInputType(value);
    setSearchType(newType);
  };

  /**
   * Get validation message based on input
   */
  const getValidationMessage = () => {
    if (!searchInput.trim()) return null;

    switch (searchType) {
      case "hex":
        return <span className="text-success">✓ Valid hex pubkey format</span>;
      case "npub":
        return <span className="text-success">✓ Valid npub format</span>;
      case "ethereum":
        if (!debouncedEthAddress) {
          return <span className="text-info">⏳ Checking format...</span>;
        }
        return (
          <span className="text-success">
            ✓ Valid Ethereum address
            {contractLoading && " (checking linkage...)"}
            {linkedPubkey && linkedPubkey !== "0x0000000000000000000000000000000000000000000000000000000000000000" && !contractLoading &&
              " (linked to Nostr)"}
            {linkedPubkey && linkedPubkey === "0x0000000000000000000000000000000000000000000000000000000000000000" && !contractLoading &&
              " (no Nostr link found)"}
          </span>
        );
      case "unknown":
        return <span className="text-error">✗ Invalid format</span>;
      default:
        return null;
    }
  };

  /**
   * Check if search is ready
   */
  const isSearchReady = () => {
    if (!searchInput.trim() || searchType === "unknown" || isValidating) {
      return false;
    }

    // For Ethereum addresses, wait for contract call to complete
    if (searchType === "ethereum") {
      return !contractLoading && debouncedEthAddress === searchInput.trim();
    }

    return true;
  };

  /**
   * Example searches for demonstration
   */
  const exampleSearches = [
    {
      name: "Hex Pubkey Example",
      value: "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
      type: "Hexadecimal (64 chars)",
      description: "Direct Nostr public key",
    },
    {
      name: "Npub Example",
      value: "npub180cvv07tjrhnsj7rkm5ee6ra3skctdx5x9ksgh4c4j9xrkeafc5dqmxg05a",
      type: "Npub (bech32)",
      description: "Bech32 encoded pubkey",
    },
    {
      name: "Ethereum Address Example",
      value: "0x742d35Cc6634C0532925a3b8D9C0ACC08Dbe7BF7",
      type: "Ethereum Address",
      description: "Linked via NostrLinkr contract",
    },
  ];

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">🔍 Profile Search</h1>
        <p className="text-base-content/70">Search for Nostr profiles by public key, npub, or Ethereum address</p>
      </div>

      {/* Search Form */}
      <div className="card bg-base-200 shadow-md">
        <div className="card-body p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Search by Identifier</span>
              </label>
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Enter hex pubkey, npub, or Ethereum address..."
                  className="input input-bordered flex-1"
                  value={searchInput}
                  onChange={handleInputChange}
                  disabled={isValidating}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!isSearchReady()}
                >
                  {isValidating || (searchType === "ethereum" && contractLoading) ? (
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
                  {getValidationMessage()}
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
                  npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6
                </code>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="badge badge-accent badge-sm mt-1">ETH</div>
              <div>
                <p className="font-medium">Ethereum Address</p>
                <p className="text-sm text-base-content/70">Linked to Nostr pubkey via NostrLinkr contract</p>
                <code className="text-xs bg-base-200 px-2 py-1 rounded">
                  0x3925E70f85882B405579bDe43b0Fc523cC95621B
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Example Searches */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body p-4">
          <h3 className="text-lg font-semibold mb-3">👤 Try Example Searches</h3>
          <div className="space-y-2">
            {exampleSearches.map((example, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{example.name}</p>
                    <span className="badge badge-outline badge-xs">{example.type}</span>
                  </div>
                  <p className="text-sm text-base-content/70">{example.description}</p>
                  <code className="text-xs text-base-content/60">
                    {example.value.length > 42
                      ? `${example.value.slice(0, 16)}...${example.value.slice(-8)}`
                      : example.value
                    }
                  </code>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setSearchInput(example.value);
                    setSearchType(detectInputType(example.value));
                  }}
                  disabled={isValidating}
                >
                  <ArrowRightIcon className="w-4 h-4" />
                  Try
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
          Enter any supported identifier to view Nostr profiles, posts, and metadata. Ethereum addresses will be checked
          for linked Nostr identities via the NostrLinkr contract.
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