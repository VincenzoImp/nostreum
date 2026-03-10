"use client";

import { useEffect, useState } from "react";
import { Address } from "@scaffold-ui/components";
import { getEventHash } from "nostr-tools";
import {
  ArrowPathIcon,
  CheckBadgeIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  ShieldCheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth/notification";

export const NostrLinkrButton = ({ address }: { address: string }) => {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [hasLinkr, setHasLinkr] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const { data: linkedPubkey } = useScaffoldReadContract({
    contractName: "NostrLinkr",
    functionName: "addressPubkey",
    args: [address],
  });

  const { writeContractAsync: pushLinkr } = useScaffoldWriteContract("NostrLinkr");
  const { writeContractAsync: pullLinkr } = useScaffoldWriteContract("NostrLinkr");

  useEffect(() => {
    setHasLinkr(
      !!linkedPubkey && linkedPubkey !== "0x0000000000000000000000000000000000000000000000000000000000000000",
    );
  }, [linkedPubkey]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notification.success("Copied to clipboard!");
    } catch {
      notification.error("Failed to copy");
    }
  };

  const formatPubkey = (pk: string) => (pk ? `${pk.slice(0, 10)}...${pk.slice(-10)}` : "");

  const performLink = async () => {
    setLoading(true);
    setResponse(null);
    try {
      if (!window.nostr) {
        notification.error("Nostr extension not available. Install Alby or nos2x.");
        setLoading(false);
        return;
      }

      const pubkey = await window.nostr.getPublicKey();
      const createdAt = Math.floor(Date.now() / 1000);
      const content = address.toLowerCase().replace("0x", "");

      const nostrEvent = { kind: 27235, created_at: createdAt, tags: [] as any[], content, pubkey };
      const eventWithId = { ...nostrEvent, id: getEventHash(nostrEvent) };
      const signedEvent = await window.nostr.signEvent(eventWithId);

      if (!signedEvent.sig || signedEvent.sig.length !== 128) {
        throw new Error("Invalid signature from Nostr extension");
      }

      await pushLinkr({
        functionName: "pushLinkr",
        args: [
          `0x${signedEvent.id}` as `0x${string}`,
          `0x${signedEvent.pubkey}` as `0x${string}`,
          BigInt(signedEvent.created_at),
          BigInt(signedEvent.kind),
          JSON.stringify(signedEvent.tags),
          signedEvent.content,
          `0x${signedEvent.sig}` as `0x${string}`,
        ],
      });

      notification.success("Link created successfully!");
      setResponse({
        message: "Identity link established on-chain!",
        eventId: signedEvent.id,
        pubkey: signedEvent.pubkey,
        signature: signedEvent.sig,
        timestamp: signedEvent.created_at,
      });
    } catch (error) {
      console.error("Error creating link:", error);
      notification.error(error instanceof Error ? error.message : "Failed to create link");
    } finally {
      setLoading(false);
    }
  };

  const performUnlink = async () => {
    setLoading(true);
    try {
      await pullLinkr({ functionName: "pullLinkr" });
      notification.success("Link removed successfully!");
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
    <div className="w-full max-w-xl mx-auto">
      <div className="bg-base-100 rounded-2xl border border-base-300/50 shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 px-6 py-5 border-b border-base-300/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <LinkIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Identity Bridge</h2>
                <p className="text-xs text-base-content/60">Link Ethereum & Nostr</p>
              </div>
            </div>
            {hasLinkr && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-success/10 text-success px-3 py-1.5 rounded-full border border-success/20">
                <CheckBadgeIcon className="w-3.5 h-3.5" />
                Linked
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Ethereum Address */}
          <div className="flex items-center gap-3 p-3.5 bg-base-200/50 rounded-xl">
            <ShieldCheckIcon className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-xs font-medium text-base-content/60 mb-0.5">Ethereum Address</p>
              <Address address={address} size="sm" />
            </div>
          </div>

          {/* Linked Pubkey */}
          {hasLinkr && linkedPubkey && (
            <div className="flex items-center justify-between p-3.5 bg-success/5 rounded-xl border border-success/15">
              <div className="flex items-center gap-3">
                <CheckBadgeIcon className="w-5 h-5 text-success shrink-0" />
                <div>
                  <p className="text-xs font-medium text-base-content/60 mb-0.5">Nostr Pubkey</p>
                  <code className="text-xs font-mono text-success">{formatPubkey(linkedPubkey)}</code>
                </div>
              </div>
              <button onClick={() => copyToClipboard(linkedPubkey)} className="btn btn-ghost btn-xs">
                <DocumentDuplicateIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Actions */}
          {!hasLinkr ? (
            <div className="space-y-4">
              <button onClick={performLink} disabled={loading} className="btn btn-primary w-full gap-2">
                {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <LinkIcon className="w-5 h-5" />}
                {loading ? "Creating Link..." : "Create Identity Link"}
              </button>

              <div className="flex items-start gap-3 p-3 bg-info/5 rounded-xl border border-info/15 text-sm">
                <ExclamationTriangleIcon className="w-5 h-5 text-info shrink-0 mt-0.5" />
                <p className="text-base-content/70">
                  Requires a Nostr browser extension (
                  <a href="https://getalby.com" target="_blank" rel="noopener noreferrer" className="link text-info">
                    Alby
                  </a>
                  {" or "}
                  <a
                    href="https://github.com/nicely-lol/nostr-browser-extension"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link text-info"
                  >
                    nos2x
                  </a>
                  ) to sign the linking event.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-3">
                <button className="btn btn-outline flex-1 gap-2" onClick={() => setShowDetails(!showDetails)}>
                  {showDetails ? "Hide Details" : "View Details"}
                </button>
                <button className="btn btn-outline btn-error flex-1 gap-2" onClick={performUnlink} disabled={loading}>
                  {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <XMarkIcon className="w-4 h-4" />}
                  {loading ? "Removing..." : "Remove Link"}
                </button>
              </div>

              {showDetails && linkedPubkey && (
                <div className="space-y-3 pt-4 border-t border-base-300/30">
                  <div className="p-3 bg-base-200/50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-base-content/60">Full Nostr Public Key</span>
                      <button onClick={() => copyToClipboard(linkedPubkey)} className="btn btn-ghost btn-xs">
                        <DocumentDuplicateIcon className="w-3 h-3" />
                      </button>
                    </div>
                    <code className="text-[11px] font-mono break-all text-base-content/70">{linkedPubkey}</code>
                  </div>
                  <div className="p-3 bg-base-200/50 rounded-lg">
                    <span className="text-xs font-medium text-base-content/60">Status</span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                      <span className="text-xs text-success font-medium">Active & Verified On-Chain</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Response */}
          {response && (
            <div className="p-4 bg-success/5 border border-success/15 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <CheckBadgeIcon className="w-5 h-5 text-success" />
                <span className="font-semibold text-success text-sm">{response.message}</span>
              </div>
              <details className="text-xs">
                <summary className="cursor-pointer text-base-content/60 hover:text-base-content/80">
                  Technical Details
                </summary>
                <div className="mt-2 space-y-1 font-mono text-base-content/50">
                  <p>Event: {response.eventId?.slice(0, 24)}...</p>
                  <p>Pubkey: {response.pubkey?.slice(0, 24)}...</p>
                  <p>Time: {response.timestamp ? new Date(response.timestamp * 1000).toLocaleString() : ""}</p>
                </div>
              </details>
            </div>
          )}
        </div>
      </div>

      {/* How it Works */}
      <div className="mt-6 p-5 bg-base-200/30 rounded-2xl border border-base-300/30">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <ShieldCheckIcon className="w-4 h-4 text-primary" />
          How Identity Linking Works
        </h3>
        <div className="space-y-2 text-xs text-base-content/70">
          {[
            "Your Nostr extension signs a special event containing your Ethereum address",
            "The signed event is submitted to the smart contract for BIP-340 Schnorr verification",
            "Both identities are cryptographically linked and verifiable on-chain",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                {i + 1}
              </span>
              <p>{step}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
