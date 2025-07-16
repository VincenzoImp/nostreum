"use client";

import { useEffect, useState } from "react";
import { getEventHash } from "nostr-tools";
import {
  ArrowPathIcon,
  CheckBadgeIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  LinkIcon,
  ShieldCheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth/notification";

/**
 * Global window interface extensions for Nostr and Ethereum browser extensions
 */
declare global {
  interface Window {
    nostr?: {
      getPublicKey: () => Promise<string>;
      signEvent: (event: any) => Promise<any>;
    };
    ethereum?: any;
  }
}

/**
 * NostrLinkrButton Component - Enhanced with Modern Design
 *
 * Provides a beautiful UI for linking/unlinking Ethereum addresses with Nostr public keys.
 * Features glassmorphism design, smooth animations, and improved UX.
 */
export const NostrLinkrButton = ({ address }: { address: string }) => {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [hasLinkr, setHasLinkr] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  /**
   * Read the Nostr public key associated with the current Ethereum address
   */
  const { data: linkedPubkey } = useScaffoldReadContract({
    contractName: "NostrLinkr",
    functionName: "addressPubkey",
    args: [address],
  });

  /**
   * Contract interaction hooks
   */
  const { writeContractAsync: pushLinkr } = useScaffoldWriteContract("NostrLinkr");
  const { writeContractAsync: pullLinkr } = useScaffoldWriteContract("NostrLinkr");

  /**
   * Check if there's an existing link
   */
  useEffect(() => {
    if (linkedPubkey && linkedPubkey !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
      setHasLinkr(true);
    } else {
      setHasLinkr(false);
    }
  }, [linkedPubkey]);

  /**
   * Copy to clipboard utility
   */
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notification.success("Copied to clipboard!");
    } catch (error) {
      notification.error("Failed to copy to clipboard");
      console.error("Copy to clipboard error:", error);
    }
  };

  /**
   * Format pubkey for display
   */
  const formatPubkey = (pubkey: string) => {
    if (!pubkey) return "";
    return `${pubkey.slice(0, 8)}...${pubkey.slice(-8)}`;
  };

  /**
   * Main function to create a link between Ethereum address and Nostr pubkey
   */
  const performLink = async () => {
    setLoading(true);
    setResponse(null);

    try {
      if (!window.nostr) {
        notification.error("Nostr extension not available. Please install Alby, nos2x, or similar extension.");
        setLoading(false);
        return;
      }

      const pubkey = await window.nostr.getPublicKey();
      const createdAt = Math.floor(Date.now() / 1000);
      const kind = 27235;
      const tags: any[] = [];
      const content = address.toLowerCase().replace("0x", "");

      const nostrEvent = {
        kind: kind,
        created_at: createdAt,
        tags: tags,
        content: content,
        pubkey: pubkey,
      };

      const eventWithId = {
        ...nostrEvent,
        id: getEventHash(nostrEvent),
      };

      const signedEvent = await window.nostr.signEvent(eventWithId);

      if (!signedEvent.sig || signedEvent.sig.length !== 128) {
        throw new Error("Invalid signature from Nostr extension");
      }

      const idBytes32 = `0x${signedEvent.id}` as `0x${string}`;
      const pubkeyBytes32 = `0x${signedEvent.pubkey}` as `0x${string}`;
      const sigBytes = `0x${signedEvent.sig}` as `0x${string}`;

      await pushLinkr({
        functionName: "pushLinkr",
        args: [
          idBytes32,
          pubkeyBytes32,
          BigInt(signedEvent.created_at),
          BigInt(signedEvent.kind),
          JSON.stringify(signedEvent.tags),
          signedEvent.content,
          sigBytes,
        ],
      });

      notification.success("🎉 Link created successfully!");

      setResponse({
        message: "Identity link established on-chain!",
        eventId: signedEvent.id,
        pubkey: signedEvent.pubkey,
        signature: signedEvent.sig,
        timestamp: signedEvent.created_at,
      });
    } catch (error) {
      console.error("Error creating link:", error);
      if (error instanceof Error) {
        notification.error(`Failed to create link: ${error.message}`);
      } else {
        notification.error(`Failed to create link: ${String(error)}`);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Function to remove an existing link
   */
  const performUnlink = async () => {
    setLoading(true);

    try {
      await pullLinkr({
        functionName: "pullLinkr",
      });

      notification.success("🔓 Link removed successfully!");
      setResponse(null);
      setShowDetails(false);
    } catch (error) {
      console.error("Error removing link:", error);
      notification.error("Failed to remove link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Main Card */}
      <div className="bg-gradient-to-br from-base-100/95 to-base-200/95 dark:from-base-800/95 dark:to-base-900/95 backdrop-blur-xl border border-base-300/40 dark:border-base-600/40 rounded-3xl shadow-2xl dark:shadow-black/20 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 dark:from-primary/10 dark:via-secondary/10 dark:to-accent/10 p-6 border-b border-base-300/20 dark:border-base-600/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-primary/10 to-secondary/10 dark:from-primary/20 dark:to-secondary/20 rounded-2xl border border-primary/10 dark:border-primary/20">
                <LinkIcon className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Identity Bridge
                </h2>
                <p className="text-sm text-base-content/70">Link your Ethereum & Nostr identities</p>
              </div>
            </div>

            {hasLinkr && (
              <div className="flex items-center gap-2 px-3 py-1 bg-success/10 dark:bg-success/20 border border-success/20 dark:border-success/30 rounded-full">
                <CheckBadgeIcon className="w-4 h-4 text-success" />
                <span className="text-xs font-semibold text-success">Linked</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* Address Display */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-base-300/20 to-base-300/10 dark:from-base-600/20 dark:to-base-600/10 rounded-2xl border border-base-300/20 dark:border-base-600/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg">
                  <ShieldCheckIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-base-content/90">Ethereum Address</p>
                  <Address address={address} size="sm" />
                </div>
              </div>
            </div>

            {/* Linked Nostr Pubkey */}
            {hasLinkr && linkedPubkey && (
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-success/5 to-emerald-500/3 dark:from-success/10 dark:to-emerald-500/5 rounded-2xl border border-success/15 dark:border-success/25">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-success/10 dark:bg-success/20 rounded-lg">
                    <CheckBadgeIcon className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-base-content/90">Linked Nostr Pubkey</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-success bg-success/5 dark:bg-success/10 px-2 py-1 rounded border border-success/20">
                        {formatPubkey(linkedPubkey)}
                      </code>
                      <button
                        onClick={() => copyToClipboard(linkedPubkey)}
                        className="p-1 hover:bg-success/10 dark:hover:bg-success/20 rounded transition-colors"
                        title="Copy full pubkey"
                      >
                        <DocumentDuplicateIcon className="w-4 h-4 text-success" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4">
            {!hasLinkr ? (
              <>
                {/* Create Link Button */}
                <button
                  onClick={performLink}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-content font-semibold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <div className="flex items-center justify-center gap-3">
                    {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <LinkIcon className="w-5 h-5" />}
                    <span className="text-lg">{loading ? "Creating Link..." : "Create Identity Link"}</span>
                  </div>
                </button>

                {/* Info Alert */}
                <div className="flex items-start gap-3 p-4 bg-info/5 dark:bg-info/10 border border-info/15 dark:border-info/25 rounded-2xl">
                  <ExclamationTriangleIcon className="w-5 h-5 text-info mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-base-content/80">
                    <p className="font-medium mb-1">Nostr Extension Required</p>
                    <p>
                      You'll need a Nostr browser extension like{" "}
                      <a
                        href="https://getalby.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-info hover:underline font-medium"
                      >
                        Alby
                      </a>{" "}
                      or{" "}
                      <a
                        href="https://github.com/fiatjaf/nos2x"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-info hover:underline font-medium"
                      >
                        nos2x
                      </a>{" "}
                      to sign the linking event.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Manage Link Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex-1 bg-gradient-to-r from-info/10 to-info/5 dark:from-info/20 dark:to-info/10 hover:from-info/20 hover:to-info/10 dark:hover:from-info/30 dark:hover:to-info/15 text-info border border-info/20 dark:border-info/30 hover:border-info/40 dark:hover:border-info/50 font-semibold py-3 px-4 rounded-2xl transition-all duration-300"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <EyeIcon className="w-5 h-5" />
                      <span>{showDetails ? "Hide Details" : "View Details"}</span>
                    </div>
                  </button>

                  <button
                    onClick={performUnlink}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-error/10 to-red-500/5 dark:from-error/20 dark:to-red-500/10 hover:from-error/20 hover:to-red-500/10 dark:hover:from-error/30 dark:hover:to-red-500/15 text-error border border-error/20 dark:border-error/30 hover:border-error/40 dark:hover:border-error/50 font-semibold py-3 px-4 rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-center gap-2">
                      {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <XMarkIcon className="w-5 h-5" />}
                      <span>{loading ? "Removing..." : "Remove Link"}</span>
                    </div>
                  </button>
                </div>

                {/* Success Message */}
                <div className="flex items-center gap-3 p-4 bg-success/5 dark:bg-success/10 border border-success/15 dark:border-success/25 rounded-2xl">
                  <CheckBadgeIcon className="w-6 h-6 text-success flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-success">Identity Successfully Linked!</p>
                    <p className="text-sm text-base-content/70 mt-1">
                      Your Ethereum address is now cryptographically linked to your Nostr identity.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Link Details - Collapsible */}
          {hasLinkr && showDetails && linkedPubkey && (
            <div className="space-y-4 border-t border-base-300/20 dark:border-base-600/20 pt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-base-content">Link Details</h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="p-2 hover:bg-base-300/30 dark:hover:bg-base-600/30 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-4 h-4 text-base-content/70" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-base-300/10 dark:bg-base-600/10 rounded-xl border border-base-300/20 dark:border-base-600/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-base-content/90">Full Nostr Public Key</span>
                    <button
                      onClick={() => copyToClipboard(linkedPubkey)}
                      className="p-1 hover:bg-base-300/30 dark:hover:bg-base-600/30 rounded transition-colors"
                      title="Copy to clipboard"
                    >
                      <DocumentDuplicateIcon className="w-4 h-4 text-base-content/70" />
                    </button>
                  </div>
                  <code className="text-xs font-mono break-all bg-base-100/50 dark:bg-base-800/50 p-2 rounded block border border-base-300/20 dark:border-base-600/20">
                    {linkedPubkey}
                  </code>
                </div>

                <div className="p-4 bg-base-300/10 dark:bg-base-600/10 rounded-xl border border-base-300/20 dark:border-base-600/20">
                  <span className="text-sm font-medium text-base-content/90">Link Status</span>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                    <span className="text-sm text-success font-medium">Active & Verified</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Response Details - After Link Creation */}
          {response && (
            <div className="space-y-4 border-t border-base-300/30 pt-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckBadgeIcon className="w-6 h-6 text-success" />
                <h3 className="text-lg font-semibold text-success">Link Created Successfully!</h3>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-success/5 border border-success/20 rounded-xl">
                  <p className="text-sm font-medium text-success mb-2">✅ {response.message}</p>
                  <p className="text-xs text-base-content/60">
                    Your identity link has been recorded on the blockchain and is now verifiable across both networks.
                  </p>
                </div>

                <details className="group">
                  <summary className="cursor-pointer p-3 bg-base-300/20 rounded-xl hover:bg-base-300/30 transition-colors">
                    <span className="font-medium">Technical Details</span>
                    <span className="text-xs text-base-content/60 ml-2">(Click to expand)</span>
                  </summary>

                  <div className="mt-3 space-y-3">
                    <div className="p-3 bg-base-100/50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-base-content/80">Event ID</span>
                        <button
                          onClick={() => copyToClipboard(response.eventId)}
                          className="p-1 hover:bg-base-300/50 rounded transition-colors"
                        >
                          <DocumentDuplicateIcon className="w-3 h-3" />
                        </button>
                      </div>
                      <code className="text-xs font-mono break-all text-base-content/70">{response.eventId}</code>
                    </div>

                    <div className="p-3 bg-base-100/50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-base-content/80">Nostr Public Key</span>
                        <button
                          onClick={() => copyToClipboard(response.pubkey)}
                          className="p-1 hover:bg-base-300/50 rounded transition-colors"
                        >
                          <DocumentDuplicateIcon className="w-3 h-3" />
                        </button>
                      </div>
                      <code className="text-xs font-mono break-all text-base-content/70">{response.pubkey}</code>
                    </div>

                    <div className="p-3 bg-base-100/50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-base-content/80">Cryptographic Signature</span>
                        <button
                          onClick={() => copyToClipboard(response.signature)}
                          className="p-1 hover:bg-base-300/50 rounded transition-colors"
                        >
                          <DocumentDuplicateIcon className="w-3 h-3" />
                        </button>
                      </div>
                      <code className="text-xs font-mono break-all text-base-content/70">{response.signature}</code>
                    </div>

                    {response.timestamp && (
                      <div className="p-3 bg-base-100/50 rounded-lg">
                        <span className="text-xs font-medium text-base-content/80">Timestamp</span>
                        <p className="text-xs text-base-content/70 mt-1">
                          {new Date(response.timestamp * 1000).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* How It Works Section */}
      <div className="mt-8 p-6 bg-gradient-to-br from-base-200/30 to-base-300/20 dark:from-base-700/30 dark:to-base-800/20 backdrop-blur-sm border border-base-300/20 dark:border-base-600/20 rounded-2xl">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-base-content">
          <ShieldCheckIcon className="w-5 h-5 text-primary" />
          How Identity Linking Works
        </h3>

        <div className="space-y-3 text-sm text-base-content/80">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary/10 dark:bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-bold mt-0.5 border border-primary/20">
              1
            </div>
            <p>Your Nostr extension signs a special event containing your Ethereum address</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary/10 dark:bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-bold mt-0.5 border border-primary/20">
              2
            </div>
            <p>The signed event is submitted to the smart contract for verification</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary/10 dark:bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-bold mt-0.5 border border-primary/20">
              3
            </div>
            <p>Both identities are now cryptographically linked and verifiable on-chain</p>
          </div>
        </div>
      </div>
    </div>
  );
};
