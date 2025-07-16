"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import {
  CheckBadgeIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { NostrLinkrButton } from "~~/components/nostr-linkr/NostrLinkrButton";

/**
 * Home Page Component
 *
 * Main landing page that combines Ethereum wallet connection with Nostr functionality.
 * Features modern design with gradients, animations, and improved UX.
 */
const Home: NextPage = () => {
  // Get connected Ethereum address from wagmi
  const { address: connectedAddress } = useAccount();

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-base-100 via-base-200 to-base-300">
        {/* Hero Section with Enhanced Design */}
        <div className="relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 opacity-50"></div>
          <div className="absolute inset-0">
            <div className="absolute top-10 left-10 w-20 h-20 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute top-32 right-20 w-16 h-16 bg-secondary/20 rounded-full blur-xl animate-pulse delay-300"></div>
            <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-accent/20 rounded-full blur-xl animate-pulse delay-700"></div>
          </div>

          <div className="relative px-5 pt-20 pb-16">
            <div className="text-center max-w-4xl mx-auto">
              {/* Main Title with Enhanced Typography */}
              <div className="mb-8">
                <h1 className="text-6xl md:text-7xl font-black mb-4 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text">
                  Nostreum
                </h1>
                <div className="flex items-center justify-center gap-2 mb-6">
                  <div className="h-px bg-gradient-to-r via-primary w-16"></div>
                  <SparklesIcon className="w-6 h-6 text-default animate-pulse" />
                  <div className="h-px bg-gradient-to-r from-primary via-secondary to-transparent w-16"></div>
                </div>
                <p className="text-2xl md:text-3xl font-semibold text-base-content/90 mb-6">
                  First client bridging Ethereum and Nostr
                </p>
                <p className="text-lg text-base-content/70 max-w-2xl mx-auto leading-relaxed">
                  Experience the future of decentralized social networking where cryptographic identity meets
                  unstoppable communication.
                </p>
              </div>

              {/* Wallet Connection Status */}
              <div className="mb-12">
                <div className="flex justify-center items-center space-x-4 flex-col sm:flex-row mb-6">
                  <p className="text-lg font-medium text-base-content/80">Your Ethereum Wallet</p>
                  <div
                    className={`px-4 py-2 rounded-full text-sm font-mono transition-all duration-300 ${
                      connectedAddress
                        ? "bg-success/20 text-success border border-success/30"
                        : "bg-warning/20 text-warning border border-warning/30"
                    }`}
                  >
                    {connectedAddress ? (
                      <span className="flex items-center gap-2">
                        <CheckBadgeIcon className="w-4 h-4" />
                        {`${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}`}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <LinkIcon className="w-4 h-4" />
                        Not connected
                      </span>
                    )}
                  </div>
                </div>

                {/* Connection Status Cards */}
                {!connectedAddress ? (
                  <div className="max-w-lg mx-auto">
                    <div className="bg-gradient-to-r from-warning/20 to-orange-500/20 backdrop-blur-sm border border-warning/30 rounded-2xl p-6 shadow-lg">
                      <div className="flex items-center justify-center mb-4">
                        <div className="p-3 bg-warning/20 rounded-full">
                          <LinkIcon className="w-8 h-8 text-warning" />
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-center">Connect Your Wallet</h3>
                      <p className="text-sm text-base-content/80 text-center leading-relaxed">
                        Connect your Ethereum wallet using the button in the header to unlock Nostr linking features and
                        access the decentralized social experience.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-lg mx-auto">
                    <div className="bg-gradient-to-r from-success/20 to-emerald-500/20 backdrop-blur-sm border border-success/30 rounded-2xl p-6 shadow-lg">
                      <div className="flex items-center justify-center mb-4">
                        <div className="p-3 bg-success/20 rounded-full">
                          <CheckBadgeIcon className="w-8 h-8 text-success" />
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-3 text-center">Wallet Connected!</h3>
                      <p className="text-sm text-base-content/80 text-center leading-relaxed">
                        Perfect! You can now link your Ethereum address with your Nostr identity and explore the
                        decentralized social network.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* NostrLinkr Section - Enhanced Design */}
        {connectedAddress && (
          <div className="py-20 px-5">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text">
                  🔗 Link Your Identities
                </h2>
                <p className="text-xl text-base-content/70 max-w-3xl mx-auto leading-relaxed">
                  Create a cryptographically verifiable link between your Ethereum address and Nostr public key. This
                  enables seamless cross-platform identity verification and unlocks enhanced social features.
                </p>
              </div>

              {/* Enhanced NostrLinkr Component Container */}
              <div className="flex justify-center">
                <div className="transform hover:scale-105 transition-all duration-300">
                  <NostrLinkrButton address={connectedAddress} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feature Overview Section - Redesigned */}
        <div className="py-20 px-5 bg-gradient-to-b from-base-100/50 to-base-200/50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-secondary to-accent bg-clip-text">
                🌟 Powerful Features
              </h2>
              <p className="text-xl text-base-content/70 max-w-3xl mx-auto leading-relaxed">
                Discover the revolutionary features that seamlessly bridge Ethereum and Nostr ecosystems
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Social Feed */}
              <Link href="/feed" className="group">
                <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-8 h-full transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-hover:border-blue-500/40">
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-4 bg-blue-500/20 rounded-xl">
                      <DocumentTextIcon className="w-8 h-8 text-blue-400" />
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-blue-400 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                  <h4 className="text-xl font-bold mb-4">🦜 Social Feed</h4>
                  <p className="text-sm text-base-content/70 mb-6 leading-relaxed">
                    Browse real-time posts from the Nostr network with integrated Ethereum address verification and
                    cross-platform identity checks.
                  </p>
                  <div className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                    Explore Feed <ChevronRightIcon className="w-4 h-4" />
                  </div>
                </div>
              </Link>

              {/* Following Feed */}
              <Link href="/following-feed" className="group">
                <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-sm border border-emerald-500/20 rounded-2xl p-8 h-full transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-hover:border-emerald-500/40">
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-4 bg-emerald-500/20 rounded-xl">
                      <UserGroupIcon className="w-8 h-8 text-emerald-400" />
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-emerald-400 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                  <h4 className="text-xl font-bold mb-4">👥 Following Feed</h4>
                  <p className="text-sm text-base-content/70 mb-6 leading-relaxed">
                    Curated personal feed showing only posts from users you follow, with enhanced privacy and content
                    control.
                  </p>
                  <div className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                    View Following <ChevronRightIcon className="w-4 h-4" />
                  </div>
                </div>
              </Link>

              {/* Profile Discovery */}
              <Link href="/profile" className="group">
                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-8 h-full transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-hover:border-purple-500/40">
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-4 bg-purple-500/20 rounded-xl">
                      <MagnifyingGlassIcon className="w-8 h-8 text-purple-400" />
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-purple-400 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                  <h4 className="text-xl font-bold mb-4">🔍 Profile Discovery</h4>
                  <p className="text-sm text-base-content/70 mb-6 leading-relaxed">
                    Find and explore interesting people across both networks with advanced search and verification
                    features.
                  </p>
                  <div className="text-sm font-semibold text-purple-400 flex items-center gap-2">
                    Discover Profiles <ChevronRightIcon className="w-4 h-4" />
                  </div>
                </div>
              </Link>

              {/* Identity Linking */}
              <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 backdrop-blur-sm border border-orange-500/20 rounded-2xl p-8">
                <div className="p-4 bg-orange-500/20 rounded-xl w-fit mb-6">
                  <LinkIcon className="w-8 h-8 text-orange-400" />
                </div>
                <h4 className="text-xl font-bold mb-4">🔗 Identity Linking</h4>
                <p className="text-sm text-base-content/70 mb-6 leading-relaxed">
                  Create cryptographically verifiable connections between your Ethereum addresses and Nostr public keys.
                </p>
                <div className="text-sm text-orange-400">Available above ↑</div>
              </div>

              {/* Cross-platform Verification */}
              <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm border border-cyan-500/20 rounded-2xl p-8">
                <div className="p-4 bg-cyan-500/20 rounded-xl w-fit mb-6">
                  <ShieldCheckIcon className="w-8 h-8 text-cyan-400" />
                </div>
                <h4 className="text-xl font-bold mb-4">✅ Verification System</h4>
                <p className="text-sm text-base-content/70 mb-6 leading-relaxed">
                  Advanced verification badges and trust indicators for linked Ethereum addresses in social profiles and
                  posts.
                </p>
                <div className="text-sm text-cyan-400">Integrated in feeds</div>
              </div>

              {/* Decentralized Publishing */}
              <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-8">
                <div className="p-4 bg-indigo-500/20 rounded-xl w-fit mb-6">
                  <GlobeAltIcon className="w-8 h-8 text-indigo-400" />
                </div>
                <h4 className="text-xl font-bold mb-4">📝 Decentralized Posts</h4>
                <p className="text-sm text-base-content/70 mb-6 leading-relaxed">
                  Publish uncensorable, cryptographically signed content to the distributed Nostr network with Ethereum
                  verification.
                </p>
                <div className="text-sm text-indigo-400">Available in feeds</div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section for Non-Connected Users - Enhanced */}
        {!connectedAddress && (
          <div className="py-20 px-5 bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5">
            <div className="max-w-5xl mx-auto">
              <div className="text-center bg-gradient-to-br from-base-100/80 to-base-200/80 backdrop-blur-xl border border-base-300/50 rounded-3xl p-12 shadow-2xl">
                <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary bg-clip-text">
                  🌉 Bridge Two Worlds
                </h2>
                <p className="text-lg text-base-content/80 max-w-3xl mx-auto mb-10 leading-relaxed">
                  Experience the future of decentralized social networking where Ethereum and Nostr work together
                  seamlessly. Connect your wallet to get started with verified cross-platform identity and unlock the
                  full potential of decentralized communication.
                </p>

                <div className="grid md:grid-cols-3 gap-8 mt-12">
                  <div className="bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 rounded-2xl p-6 hover:scale-105 transition-transform duration-300">
                    <div className="p-4 bg-accent/20 rounded-xl w-fit mx-auto mb-4">
                      <ShieldCheckIcon className="w-8 h-8 text-accent" />
                    </div>
                    <h4 className="text-lg font-bold mb-3">🔐 Secure Identity</h4>
                    <p className="text-sm text-base-content/70 leading-relaxed">
                      Cryptographically link your Ethereum and Nostr identities with mathematically verifiable proofs
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 rounded-2xl p-6 hover:scale-105 transition-transform duration-300">
                    <div className="p-4 bg-accent/20 rounded-xl w-fit mx-auto mb-4">
                      <GlobeAltIcon className="w-8 h-8 text-accent" />
                    </div>
                    <h4 className="text-lg font-bold mb-3">🌐 Decentralized</h4>
                    <p className="text-sm text-base-content/70 leading-relaxed">
                      No central authority controls your data, connections, or communications - true digital sovereignty
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 rounded-2xl p-6 hover:scale-105 transition-transform duration-300">
                    <div className="p-4 bg-accent/20 rounded-xl w-fit mx-auto mb-4">
                      <RocketLaunchIcon className="w-8 h-8 text-accent" />
                    </div>
                    <h4 className="text-lg font-bold mb-3">🚀 Future-Ready</h4>
                    <p className="text-sm text-base-content/70 leading-relaxed">
                      Built for the next generation of internet infrastructure with cutting-edge protocols and standards
                    </p>
                  </div>
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
