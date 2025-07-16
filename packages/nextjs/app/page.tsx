"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { BugAntIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { NostrFeedReader } from "~~/components/nostr-linkr/NostrFeedReader";
import { NostrLinkrButton } from "~~/components/nostr-linkr/NostrLinkrButton";

/**
 * Home Page Component
 *
 * Main landing page that combines Ethereum wallet connection with Nostr functionality.
 * Features:
 * - Wallet connection status
 * - NostrLinkr button for linking Ethereum address with Nostr pubkey
 * - Full Nostr feed reader with social features
 * - Seamless integration between Ethereum and Nostr ecosystems
 */
const Home: NextPage = () => {
  // Get connected Ethereum address from wagmi
  const { address: connectedAddress } = useAccount();

  return (
    <>
      <div className="flex items-center flex-col flex-grow pt-10">
        {/* Hero Section */}
        <div className="px-5">
          <h1 className="text-center">
            <span className="block text-4xl font-bold mb-2">Nostreum</span>
            <span className="block text-2xl mb-2">First client bridging Ethereum and Nostr</span>
          </h1>
          <div className="flex justify-center items-center space-x-2 flex-col sm:flex-row">
            <p className="my-2 font-medium">Connect your Ethereum wallet to get started</p>
            <code className="italic bg-base-300 text-base font-bold max-w-full break-words break-all inline-block">
              {connectedAddress ? connectedAddress : "Not connected"}
            </code>
          </div>

          {/* Connection Status and Instructions */}
          {!connectedAddress ? (
            <div className="text-center mt-8 p-6 bg-warning/20 rounded-xl max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold mb-2">🔌 Connect Your Wallet</h3>
              <p className="text-sm opacity-80">
                Please connect your Ethereum wallet using the button in the top right corner to access Nostr linking
                features and the social feed.
              </p>
            </div>
          ) : (
            <div className="text-center mt-8 p-6 bg-success/20 rounded-xl max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold mb-2">✅ Wallet Connected</h3>
              <p className="text-sm opacity-80">
                Great! You can now link your Ethereum address with your Nostr identity and explore the decentralized
                social feed below.
              </p>
            </div>
          )}
        </div>

        {/* NostrLinkr Section - Only show when wallet is connected */}
        {connectedAddress && (
          <div className="mt-12 w-full max-w-4xl px-5">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">🔗 Link Your Identities</h2>
              <p className="text-lg text-base-content/70 max-w-2xl mx-auto">
                Create a verifiable link between your Ethereum address and Nostr public key. This enables cross-platform
                identity verification and enhanced social features.
              </p>
            </div>

            {/* NostrLinkr Button Component */}
            <div className="flex justify-center">
              <NostrLinkrButton address={connectedAddress} />
            </div>
          </div>
        )}

        {/* Separator */}
        {connectedAddress && (
          <div className="w-full max-w-4xl px-5 mt-12 mb-8 text-center">
            <hr className="border-t border-base-300 mb-6" />
            <p className="text-base-content/50">Explore the Nostr social feed below</p>
            <hr className="border-t border-base-300 mt-6" />
          </div>
        )}

        {/* Nostr Feed Reader Section */}
        {connectedAddress ? (
          <div className="w-full max-w-4xl px-5 mb-20">
            {/* Feed Reader Component */}
            <NostrFeedReader />
          </div>
        ) : (
          /* Alternative content when wallet is not connected */
          <div className="w-full max-w-4xl px-5 mb-20">
            <div className="text-center mt-12 p-8 bg-base-200 rounded-xl">
              <h2 className="text-2xl font-bold mb-4 opacity-50">🦜 Decentralized Social Feed</h2>
              <p className="text-base-content/50 max-w-2xl mx-auto mb-6">
                Connect your Ethereum wallet to access the Nostr social feed and see how blockchain and decentralized
                social networks work together.
              </p>

              {/* Feature preview cards */}
              <div className="grid md:grid-cols-3 gap-4 mt-8">
                <div className="card bg-base-300/50 p-4">
                  <h4 className="font-semibold mb-2">📖 Read Notes</h4>
                  <p className="text-sm opacity-70">Browse real-time posts from the Nostr network</p>
                </div>
                <div className="card bg-base-300/50 p-4">
                  <h4 className="font-semibold mb-2">🔗 ETH Links</h4>
                  <p className="text-sm opacity-70">See which authors have linked Ethereum addresses</p>
                </div>
                <div className="card bg-base-300/50 p-4">
                  <h4 className="font-semibold mb-2">✍️ Post & Follow</h4>
                  <p className="text-sm opacity-70">Share your thoughts and follow interesting people</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Links */}
        <div className="flex-grow bg-base-300 w-full mt-16 px-8 py-12">
          <div className="flex justify-center items-center gap-12 flex-col sm:flex-row">
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <BugAntIcon className="h-8 w-8 fill-secondary" />
              <p>
                Tinker with your smart contract using the{" "}
                <Link href="/debug" passHref className="link">
                  Debug Contracts
                </Link>{" "}
                tab.
              </p>
            </div>
            <div className="flex flex-col bg-base-100 px-10 py-10 text-center items-center max-w-xs rounded-3xl">
              <MagnifyingGlassIcon className="h-8 w-8 fill-secondary" />
              <p>
                Explore your local transactions with the{" "}
                <Link href="/blockexplorer" passHref className="link">
                  Block Explorer
                </Link>{" "}
                tab.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
