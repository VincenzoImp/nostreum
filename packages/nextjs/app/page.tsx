"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { NostrLinkrButton } from "~~/components/nostr-linkr/NostrLinkrButton";

/**
 * Home Page Component
 *
 * Main landing page that combines Ethereum wallet connection with Nostr functionality.
 * Features:
 * - Wallet connection status
 * - NostrLinkr button for linking Ethereum address with Nostr pubkey
 * - Information about Nostr integration
 * - Navigation to feed and other features
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
                social feed.
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

        {/* Feature Overview Section */}
        <div className="w-full max-w-4xl px-5 mt-16 mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">🌟 Features</h2>
            <p className="text-lg text-base-content/70 max-w-2xl mx-auto">
              Explore the features that bridge Ethereum and Nostr ecosystems
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feed Features */}
            <Link href="/feed" className="card bg-base-200 hover:bg-base-300 transition-colors p-6">
              <h4 className="font-bold text-lg mb-3">🦜 Social Feed</h4>
              <p className="text-sm text-base-content/70 mb-4">
                Browse real-time posts from the Nostr network with Ethereum address verification checks
              </p>
              <div className="text-sm font-medium">Explore Feed →</div>
            </Link>

            {/* Following Feed */}
            <Link href="/following-feed" className="card bg-base-200 hover:bg-base-300 transition-colors p-6">
              <h4 className="font-bold text-lg mb-3">👥 Following Feed</h4>
              <p className="text-sm text-base-content/70 mb-4">
                Curated feed showing only posts from users you follow
              </p>
              <div className="text-sm font-medium">View Following →</div>
            </Link>

            {/* Identity Linking */}
            <div className="card bg-base-200 p-6">
              <h4 className="font-bold text-lg mb-3">🔗 Identity Linking</h4>
              <p className="text-sm text-base-content/70 mb-4">
                Verifiable connections between Ethereum addresses and Nostr pubkeys
              </p>
              <div className="text-sm">Available above</div>
            </div>

            {/* Cross-platform Verification */}
            <div className="card bg-base-200 p-6">
              <h4 className="font-bold text-lg mb-3">✅ Verification</h4>
              <p className="text-sm text-base-content/70 mb-4">
                See verified Ethereum links in social profiles and posts
              </p>
              <div className="text-sm">In feeds</div>
            </div>

            {/* Decentralized Posts */}
            <div className="card bg-base-200 p-6">
              <h4 className="font-bold text-lg mb-3">📝 Decentralized Posts</h4>
              <p className="text-sm text-base-content/70 mb-4">
                Publish uncensorable content to the Nostr network
              </p>
              <div className="text-sm">In feeds</div>
            </div>

            {/* Profile Discovery */}
            <div className="card bg-base-200 p-6">
              <h4 className="font-bold text-lg mb-3">🔍 Profile Discovery</h4>
              <p className="text-sm text-base-content/70 mb-4">
                Find and follow interesting people across both networks
              </p>
              <div className="text-sm">Coming soon</div>
            </div>
          </div>
        </div>

        {/* CTA Section for Non-Connected Users */}
        {!connectedAddress && (
          <div className="w-full max-w-4xl px-5 mb-20">
            <div className="text-center mt-12 p-8 bg-base-200 rounded-xl">
              <h2 className="text-2xl font-bold mb-4">🌉 Bridge Two Worlds</h2>
              <p className="text-base-content/70 max-w-2xl mx-auto mb-6">
                Experience the future of decentralized social networking where Ethereum and Nostr work together seamlessly.
                Connect your wallet to get started with verified cross-platform identity.
              </p>

              <div className="grid md:grid-cols-3 gap-4 mt-8">
                <div className="card bg-base-300/50 p-4">
                  <h4 className="font-semibold mb-2">🔐 Secure Identity</h4>
                  <p className="text-sm opacity-70">Cryptographically link your Ethereum and Nostr identities</p>
                </div>
                <div className="card bg-base-300/50 p-4">
                  <h4 className="font-semibold mb-2">🌐 Decentralized</h4>
                  <p className="text-sm opacity-70">No central authority controls your data or connections</p>
                </div>
                <div className="card bg-base-300/50 p-4">
                  <h4 className="font-semibold mb-2">🚀 Future-Ready</h4>
                  <p className="text-sm opacity-70">Built for the next generation of internet infrastructure</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Home;