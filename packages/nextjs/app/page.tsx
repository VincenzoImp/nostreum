"use client";

import Link from "next/link";
import { useLinkStatus } from "~~/hooks/bridge/useLinkStatus";

export default function LandingPage() {
  const { isConnected, isLinked } = useLinkStatus();

  return (
    <div className="hero-glow">
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6">
        {/* Hero */}
        <section className="py-20 md:py-32 text-center">
          <div className="stagger-children">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              On-Chain Identity Verification
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-[1.1]">
              Bridge your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#627EEA] to-primary">Ethereum</span>
              <br className="hidden sm:block" /> identity to{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent animate-gradient-x">
                Nostr
              </span>
            </h1>

            <p className="text-base-content/50 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              The first cryptographic bridge linking Ethereum addresses with Nostr public keys. Verified entirely
              on-chain with BIP-340 Schnorr signatures.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/feed"
                className="btn btn-primary rounded-full px-8 h-12 text-base shadow-[0_0_20px_-4px] shadow-primary/30"
              >
                Explore Feed
              </Link>
              <Link
                href="/bridge"
                className="btn btn-ghost rounded-full px-8 h-12 text-base border border-base-content/10 hover:border-primary/30 hover:bg-primary/5"
              >
                {isConnected && !isLinked ? "Link Identity" : "Learn More"}
              </Link>
            </div>
          </div>
        </section>

        {/* Visual bridge representation */}
        <section className="pb-20 md:pb-28">
          <div className="relative max-w-2xl mx-auto">
            <div className="flex items-center justify-between gap-4">
              {/* Ethereum side */}
              <div className="flex-1 glass-card p-6 text-center animate-fade-in-up">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#627EEA]/10 flex items-center justify-center">
                  <svg className="w-7 h-7 text-[#627EEA]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1.5l-7 10.167L12 15.5l7-3.833L12 1.5zM5 13.5L12 22.5l7-9-7 3.833L5 13.5z" />
                  </svg>
                </div>
                <h3 className="font-bold text-sm mb-1">Ethereum</h3>
                <p className="text-xs text-base-content/40">ECDSA Address</p>
              </div>

              {/* Bridge icon */}
              <div className="shrink-0 animate-float">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_24px_-4px] shadow-primary/30">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                    />
                  </svg>
                </div>
              </div>

              {/* Nostr side */}
              <div className="flex-1 glass-card p-6 text-center animate-fade-in-up" style={{ animationDelay: "100ms" }}>
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <svg className="w-7 h-7 text-primary" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </div>
                <h3 className="font-bold text-sm mb-1">Nostr</h3>
                <p className="text-xs text-base-content/40">Schnorr Public Key</p>
              </div>
            </div>

            {/* Connecting line */}
            <div className="absolute top-1/2 left-[20%] right-[20%] h-px -translate-y-1/2 -z-10">
              <div className="w-full h-full bg-gradient-to-r from-[#627EEA]/20 via-primary/40 to-accent/20" />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="pb-20 md:pb-28">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">Why Nostreum?</h2>
            <p className="text-base-content/40 max-w-lg mx-auto">
              Trustless, on-chain identity verification connecting two decentralized ecosystems
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4 stagger-children">
            {[
              {
                title: "Fully On-Chain",
                desc: "BIP-340 Schnorr signature verification using the MODEXP precompile. No oracles, no trusted parties.",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                    />
                  </svg>
                ),
              },
              {
                title: "Bidirectional",
                desc: "Look up any Ethereum address by Nostr pubkey or vice versa. One-to-one mapping stored on-chain forever.",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                    />
                  </svg>
                ),
              },
              {
                title: "Social Integration",
                desc: "Browse Nostr with verified Ethereum identities. See who's linked, follow, post, and react.",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                    />
                  </svg>
                ),
              },
            ].map((feature, i) => (
              <div key={i} className="glass-card-hover p-6 group">
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-base-content/45 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="pb-24 md:pb-32">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">Three simple steps</h2>
          </div>
          <div className="max-w-2xl mx-auto">
            <div className="space-y-0">
              {[
                { step: "1", title: "Connect", desc: "Connect your Ethereum wallet and Nostr browser extension" },
                {
                  step: "2",
                  title: "Sign",
                  desc: "Your Nostr extension signs a kind 13372 event containing your ETH address",
                },
                {
                  step: "3",
                  title: "Verify",
                  desc: "The contract verifies the BIP-340 Schnorr signature and stores the link on-chain",
                },
              ].map((item, i) => (
                <div key={item.step} className="flex gap-5 group">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-[0_0_12px_-2px] shadow-primary/20">
                      {item.step}
                    </div>
                    {i < 2 && <div className="w-px h-full bg-gradient-to-b from-primary/20 to-transparent min-h-8" />}
                  </div>
                  <div className="pb-8">
                    <h3 className="font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-base-content/45">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-center mt-4">
            <Link
              href="/bridge"
              className="btn btn-primary rounded-full px-8 h-12 text-base shadow-[0_0_20px_-4px] shadow-primary/30"
            >
              Get Started
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-base-300/30 py-8 text-center">
          <p className="text-xs text-base-content/30">
            Built on Base Sepolia &middot; Open Source &middot;{" "}
            <a
              href="https://github.com/VincenzoImp/nostreum"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              GitHub
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
