"use client";

import { useState } from "react";
import { createAndSignLinkEvent } from "nostr-linkr";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useLinkStatus } from "~~/hooks/bridge/useLinkStatus";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { truncateAddress, truncatePubkey } from "~~/utils/nostr/formatting";
import { notification } from "~~/utils/scaffold-eth/notification";

export default function BridgePage() {
  const { address, isConnected } = useAccount();
  const { isLinked, linkedPubkey, loading: statusLoading } = useLinkStatus();
  const { writeContractAsync: writePushLinkr } = useScaffoldWriteContract("NostrLinkr");
  const { writeContractAsync: writePullLinkr } = useScaffoldWriteContract("NostrLinkr");

  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [step, setStep] = useState(0);

  const handleLink = async () => {
    if (!address || !window.nostr) {
      notification.error("Please install a Nostr extension (Alby, nos2x)");
      return;
    }

    setLinking(true);
    try {
      setStep(1);

      setStep(2);
      const signedEvent = await createAndSignLinkEvent(window.nostr, address);

      setStep(3);
      await writePushLinkr({
        functionName: "pushLinkr",
        args: [
          `0x${signedEvent.pubkey}` as `0x${string}`,
          BigInt(signedEvent.created_at),
          BigInt(signedEvent.kind),
          JSON.stringify(signedEvent.tags),
          `0x${signedEvent.sig}` as `0x${string}`,
        ],
      });

      notification.success("Identity linked on-chain!");
      setStep(0);
    } catch (error) {
      console.error("Link error:", error);
      notification.error(error instanceof Error ? error.message : "Failed to create link");
      setStep(0);
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async () => {
    setUnlinking(true);
    try {
      await writePullLinkr({ functionName: "pullLinkr" });
      notification.success("Identity link removed");
    } catch {
      notification.error("Failed to remove link");
    } finally {
      setUnlinking(false);
    }
  };

  const steps = [
    { n: 1, label: "Nostr pubkey" },
    { n: 2, label: "Sign event" },
    { n: 3, label: "On-chain TX" },
  ];

  return (
    <div className="max-w-xl mx-auto w-full px-4 sm:px-6 py-10 md:py-16">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_32px_-6px] shadow-primary/30 animate-float">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.061a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.25 8.832"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-3">Identity Bridge</h1>
        <p className="text-sm text-base-content/45 max-w-sm mx-auto">
          Cryptographically link your Ethereum address with your Nostr public key — verified on-chain
        </p>
      </div>

      {/* Not Connected */}
      {!isConnected && (
        <div className="glass-card p-8 text-center animate-fade-in">
          <div className="w-12 h-12 rounded-xl bg-base-300/30 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-base-content/30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
              />
            </svg>
          </div>
          <p className="text-sm text-base-content/50 mb-5">Connect your Ethereum wallet to get started</p>
          <RainbowKitCustomConnectButton />
        </div>
      )}

      {/* Loading */}
      {isConnected && statusLoading && (
        <div className="glass-card p-12 flex justify-center animate-fade-in">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Connected & Linked */}
      {isConnected && !statusLoading && isLinked && (
        <div className="glass-card overflow-hidden animate-fade-in">
          <div className="bg-success/8 border-b border-success/10 px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-success" />
              <span className="text-sm font-bold text-success">Identity Linked</span>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-4 p-4 bg-base-200/50 rounded-xl">
              <div className="flex-1">
                <p className="text-[10px] font-semibold text-base-content/40 uppercase tracking-wider mb-1">Ethereum</p>
                <p className="font-mono text-sm">{address ? truncateAddress(address, 8) : ""}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                  />
                </svg>
              </div>
              <div className="flex-1 text-right">
                <p className="text-[10px] font-semibold text-base-content/40 uppercase tracking-wider mb-1">Nostr</p>
                <p className="font-mono text-sm">{linkedPubkey ? truncatePubkey(linkedPubkey, 8) : ""}</p>
              </div>
            </div>
            <button
              onClick={handleUnlink}
              disabled={unlinking}
              className="btn btn-outline btn-error btn-sm w-full rounded-xl"
            >
              {unlinking ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-error border-t-transparent rounded-full animate-spin" />
                  Removing...
                </span>
              ) : (
                "Remove Link"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Connected & Not Linked */}
      {isConnected && !statusLoading && !isLinked && (
        <div className="glass-card overflow-hidden animate-fade-in">
          <div className="p-6 space-y-5">
            <div className="p-4 bg-base-200/50 rounded-xl">
              <p className="text-[10px] font-semibold text-base-content/40 uppercase tracking-wider mb-1">
                Your Ethereum Address
              </p>
              <p className="font-mono text-sm">{address}</p>
            </div>

            {/* Step indicator */}
            {linking && step > 0 && (
              <div className="flex items-center justify-between gap-2 px-1">
                {steps.map(({ n, label }) => (
                  <div key={n} className="flex items-center gap-2 text-xs">
                    {step > n ? (
                      <div className="w-5 h-5 rounded-full bg-success/15 flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-success"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : step === n ? (
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-base-content/15" />
                    )}
                    <span className={step >= n ? "text-primary font-medium" : "text-base-content/25"}>{label}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleLink}
              disabled={linking}
              className="btn btn-primary w-full rounded-xl h-12 text-base shadow-[0_0_20px_-4px] shadow-primary/30"
            >
              {linking ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-content border-t-transparent rounded-full animate-spin" />
                  Linking...
                </span>
              ) : (
                "Link Identity"
              )}
            </button>

            <p className="text-xs text-base-content/30 text-center">
              Requires a{" "}
              <a
                href="https://getalby.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline underline-offset-2"
              >
                Nostr browser extension
              </a>{" "}
              to sign the linking event
            </p>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="mt-10 space-y-4">
        <h2 className="text-sm font-bold text-base-content/50 uppercase tracking-wider">How it works</h2>
        {[
          {
            title: "Sign with Nostr",
            desc: "Your Nostr extension signs a kind 13372 event containing your Ethereum address",
          },
          {
            title: "On-Chain Verification",
            desc: "The smart contract verifies the BIP-340 Schnorr signature using the MODEXP precompile",
          },
          {
            title: "Bidirectional Mapping",
            desc: "Both identities are linked on-chain. Anyone can query the mapping in either direction",
          },
        ].map((item, i) => (
          <div key={i} className="flex gap-4 group">
            <div className="w-8 h-8 rounded-lg bg-primary/8 text-primary flex items-center justify-center text-xs font-bold shrink-0 group-hover:bg-primary/15 transition-colors">
              {i + 1}
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-0.5">{item.title}</h3>
              <p className="text-xs text-base-content/40 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
