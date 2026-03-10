"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import {
  CheckBadgeIcon,
  ChevronRightIcon,
  GlobeAltIcon,
  LinkIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { NostrLinkrButton } from "~~/components/nostreum/NostrLinkrButton";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="relative max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-black mb-4 tracking-tight">Nostreum</h1>
          <p className="text-xl md:text-2xl text-base-content/70 mb-3 font-medium">Bridge Ethereum and Nostr</p>
          <p className="text-base text-base-content/50 max-w-2xl mx-auto mb-10">
            The first on-chain identity verification system linking Ethereum addresses with Nostr public keys using
            BIP-340 Schnorr signature verification.
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-mono border mb-8">
            {connectedAddress ? (
              <>
                <CheckBadgeIcon className="w-4 h-4 text-success" />
                <span className="text-success">{`${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}`}</span>
              </>
            ) : (
              <>
                <LinkIcon className="w-4 h-4 text-base-content/40" />
                <span className="text-base-content/40">Connect wallet to get started</span>
              </>
            )}
          </div>

          {connectedAddress ? (
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/feed" className="btn btn-primary gap-2">
                <GlobeAltIcon className="w-4 h-4" /> Explore Feed
              </Link>
              <Link href="/following" className="btn btn-outline gap-2">
                <UserGroupIcon className="w-4 h-4" /> Following
              </Link>
            </div>
          ) : (
            <p className="text-sm text-base-content/40">Connect your Ethereum wallet using the button in the header.</p>
          )}
        </div>
      </section>

      {connectedAddress && (
        <section className="py-16 px-4">
          <div className="max-w-xl mx-auto">
            <NostrLinkrButton address={connectedAddress} />
          </div>
        </section>
      )}

      <section className="py-16 px-4 bg-base-200/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Features</h2>
          <div className="grid md:grid-cols-3 gap-5">
            <Link href="/feed" className="group">
              <div className="bg-base-100 border border-base-300/50 rounded-2xl p-6 h-full transition-all hover:shadow-lg hover:border-primary/30">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-500/10 rounded-xl">
                    <GlobeAltIcon className="w-6 h-6 text-blue-500" />
                  </div>
                  <ChevronRightIcon className="w-4 h-4 text-base-content/30 group-hover:text-primary transition-colors" />
                </div>
                <h3 className="font-bold mb-2">Social Feed</h3>
                <p className="text-sm text-base-content/60">
                  Browse real-time posts from the Nostr network with Ethereum address verification.
                </p>
              </div>
            </Link>

            <Link href="/following" className="group">
              <div className="bg-base-100 border border-base-300/50 rounded-2xl p-6 h-full transition-all hover:shadow-lg hover:border-primary/30">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-emerald-500/10 rounded-xl">
                    <UserGroupIcon className="w-6 h-6 text-emerald-500" />
                  </div>
                  <ChevronRightIcon className="w-4 h-4 text-base-content/30 group-hover:text-primary transition-colors" />
                </div>
                <h3 className="font-bold mb-2">Following Feed</h3>
                <p className="text-sm text-base-content/60">Curated feed showing only posts from users you follow.</p>
              </div>
            </Link>

            <div className="bg-base-100 border border-base-300/50 rounded-2xl p-6 h-full">
              <div className="p-3 bg-purple-500/10 rounded-xl w-fit mb-4">
                <ShieldCheckIcon className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="font-bold mb-2">On-Chain Verification</h3>
              <p className="text-sm text-base-content/60">
                Full BIP-340 Schnorr signature verification on-chain using secp256k1 elliptic curve math.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">How It Works</h2>
          <div className="space-y-6">
            {[
              {
                step: "1",
                title: "Connect Wallet",
                desc: "Connect your Ethereum wallet and install a Nostr browser extension like Alby.",
              },
              {
                step: "2",
                title: "Sign Linking Event",
                desc: "Your Nostr extension creates a special event (kind 27235) containing your Ethereum address and signs it with your Nostr private key.",
              },
              {
                step: "3",
                title: "On-Chain Verification",
                desc: "The NostrLinkr smart contract verifies the BIP-340 Schnorr signature on-chain and creates a bidirectional mapping between your identities.",
              },
            ].map(item => (
              <div key={item.step} className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-base-content/60">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
