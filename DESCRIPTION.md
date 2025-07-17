# 🌉 Nostreum: Bridging Ethereum & Nostr Through Cryptographic Identity Linking

Nostreum introduces the first on-chain verification system that links different cryptographic protocols, creating a cryptographically provable bridge between ECDSA signatures used by Ethereum and Schnorr signatures employed by Nostr through smart contract verification.

## Core Innovation

The fundamental breakthrough lies in a Scaffold-ETH extension that enables on-chain verification linking an Ethereum private key (ECDSA) with a Nostr private key (Schnorr). This creates a mathematical bridge between Ethereum's financial ecosystem and Nostr's social network, allowing one identity to operate across both platforms with cryptographic proof.

## Enhanced Social Platform

Nostreum functions as a full-featured Nostr client with complete social networking capabilities including feeds, following, profile discovery, and decentralized publishing. The key innovation adds cross-platform features: ETH verification badges display linked Ethereum addresses on Nostr profiles, while cross-platform search allows finding users by their Ethereum address, giving financial accounts social identities.

## Unlocked Possibilities

The cryptographic bridge enables bidirectional value flow. Users can leverage social reputation from Nostr to access financial opportunities on Ethereum, while displaying on-chain achievements like NFTs and DeFi success as social credibility. This particularly benefits activists who can receive Ethereum funding while maintaining censorship-resistant Nostr communication, and creators who can monetize through Ethereum while building audiences on Nostr.

## Technical Implementation

The system uses Scaffold-ETH framework extended with Nostr protocol integration. Users connect their Ethereum wallet, generate cryptographic proof linking their keys, then smart contracts validate and store the identity link on-chain. This enables enhanced cross-platform features across both ecosystems.

## Current Status and Future

Live demos showcase wallet linking, social feeds with ETH badges, cross-platform user search, and cryptographic proof verification. Future development includes NFT gallery integration, DeFi activity badges, multi-chain support, and reputation-based financial services. Notably, Schnorr signatures also function as Bitcoin addresses, making this potentially a three-way Bitcoin-Nostr-Ethereum bridge.

## Getting Started

Requirements include Node.js 18+, Ethereum wallet, and Git. Install by cloning from https://github.com/VincenzoImp/nostreum.git, then run `yarn install`, `yarn chain`, `yarn deploy`, and `yarn start`. Access at localhost:3000 to connect wallet and explore features.

Live demos available on Base Sepolia (https://nostreum-crchg2q24-vincenzoimps-projects.vercel.app) and Avalanche Fuji (https://nostreum-r8srcy75v-vincenzoimps-projects.vercel.app). Full source code and presentation available on GitHub.

Nostreum builds the foundation for unified decentralized identity, creating new possibilities for leveraging digital presence across multiple blockchain ecosystems.