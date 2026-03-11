# CLAUDE.md - Nostreum Project Guide

## Project Overview

Nostreum is the first on-chain verification system that cryptographically links Ethereum addresses (ECDSA) with Nostr public keys (Schnorr/BIP-340). It bridges Ethereum's financial network with Nostr's decentralized social platform.

**Live**: https://nostreum.vercel.app (Base Sepolia testnet)

## Tech Stack

- **Smart Contracts**: Solidity ^0.8.20, Hardhat, OpenZeppelin (Ownable, Pausable), hardhat-deploy
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript 5.8
- **Web3**: wagmi 2.x, viem 2.x, RainbowKit 2.x
- **Nostr**: nostr-tools 2.x (event hashing, signature verification), WebSocket connections
- **UI**: Tailwind CSS 4.x, DaisyUI 5.x
- **State**: Zustand 5.x, React Query 5.x
- **Package Manager**: Yarn 3.2 (workspaces)

## Repository Structure

```
packages/
  hardhat/                    # Smart contract package
    contracts/NostrLinkr.sol  # Core contract with BIP-340 Schnorr verification
    deploy/                   # Deployment scripts
    deployments/baseSepolia/  # Deployed contract artifacts
    test/NostrLinkr.test.ts   # Contract tests (22 tests)
  nextjs/                     # Frontend package
    app/                      # Next.js App Router pages
      page.tsx                # Landing page
      feed/page.tsx           # Main Nostr social feed
      following-feed/page.tsx # Filtered feed (following only)
      profile/page.tsx        # Profile search
      profile/[pubkey]/       # Individual profile view
      blockexplorer/          # Transaction/address explorer
      debug/                  # Contract debugging interface
    components/
      nostr-linkr/            # Identity linking UI
      nostreum/               # Feed, EventCard, AuthorInfo, PostForm
      scaffold-eth/           # Scaffold-ETH base components
    hooks/
      nostreum/
        useNostrConnection.ts # Core Nostr relay hook with event validation
        useEthereumAddress.ts # Shared hook for ETH address lookup (single RPC per pubkey)
        useFollowing.ts       # Shared following list management with localStorage
      scaffold-eth/           # Contract interaction hooks
    services/
      store/store.ts          # Zustand global store
      web3/                   # Wagmi config, connectors
    types/nostreum.ts         # Nostr types
    scaffold.config.ts        # App configuration
```

## Key Commands

```bash
yarn install          # Install all dependencies
yarn chain            # Start local Hardhat node
yarn deploy           # Deploy contracts
yarn start            # Start Next.js dev server (port 3000)
yarn format           # Format with Prettier
yarn lint             # ESLint
yarn workspace @se-2/hardhat hardhat test --network hardhat  # Run contract tests
yarn next:build       # Production build
yarn vercel:yolo      # Deploy to Vercel (ignore build errors)
```

## Smart Contract: NostrLinkr

**Address**: Deployed on Base Sepolia (see `packages/hardhat/deployments/baseSepolia/`)

### Features
- **Ownable**: Owner can pause/unpause contract (OpenZeppelin Ownable)
- **Pausable**: Emergency stop for `pushLinkr` (OpenZeppelin Pausable)
- **BIP-340 Schnorr verification**: Full on-chain verification using MODEXP precompile
- **Timestamp bounds**: 5-minute future tolerance, 1-hour past tolerance

### Core Functions
- `pushLinkr(id, pubkey, createdAt, kind, tags, content, sig)` - Create bidirectional link (whenNotPaused)
- `pullLinkr()` - Remove caller's link
- `verifyNostrEvent(...)` - Verify Nostr event per NIP-01 (view)
- `addressPubkey(address)` / `pubkeyAddress(bytes32)` - Lookup mappings
- `getEventHash(pubkey, createdAt, kind, tags, content)` - Compute event hash (consistent with verifyNostrEvent)
- `pause()` / `unpause()` - Emergency controls (onlyOwner)

### Linking Flow
1. Nostr extension signs event (kind 27235) containing Ethereum address
2. Event submitted to contract with all parameters
3. Contract verifies SHA-256 event hash matches NIP-01 serialization
4. BIP-340 Schnorr signature verified on-chain (liftX, ecMul, ecAdd)
5. Bidirectional mapping stored on-chain

## Frontend Architecture

### Nostr Connection (`useNostrConnection` hook)
- Default relay: `wss://relay.damus.io`
- Fallbacks: `wss://nos.lol`, `wss://relay.nostr.band`, `wss://nostr-pub.wellorder.net`
- Auto-reconnect with exponential backoff (max 5 attempts)
- Event signature verification via `nostr-tools.verifyEvent()` before processing
- Accepts optional `messageFilter` callback for page-specific filtering (replaces onmessage override pattern)
- Event kinds: 0 (metadata), 1 (text notes), 7 (reactions), 27235 (linking)

### Shared Hooks
- `useEthereumAddress(pubkey)` - Single contract read per pubkey, passed as prop to avoid duplicates
- `useFollowing(setAuthors)` - localStorage-backed follow/unfollow with author state sync

### State Management
- Following list: localStorage (`nostr-following`) via `useFollowing` hook
- Contract state: wagmi hooks with React Query
- Global state: Zustand (currency price, network)

## Environment Variables

```env
# packages/hardhat/.env
ALCHEMY_API_KEY=
ETHERSCAN_V2_API_KEY=
DEPLOYER_PRIVATE_KEY_ENCRYPTED=

# packages/nextjs/.env.local
NEXT_PUBLIC_ALCHEMY_API_KEY=
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=
```

Defaults are provided in config files but should be overridden for production.

## Code Conventions

- Prettier for formatting (with Solidity plugin)
- ESLint with Next.js config
- Pre-commit hooks via Husky + lint-staged
- Path aliases: `~~/` maps to `packages/nextjs/`
- Components use "use client" directive (client-side rendering)
- Contract interactions via scaffold-eth hooks (`useScaffoldReadContract`, `useScaffoldWriteContract`)
- Ethereum address lookups centralized in `useEthereumAddress` hook (never duplicate in components)
- Following logic centralized in `useFollowing` hook (never duplicate in pages)

## Known Issues

- Pre-existing SSR build error: `localStorage.getItem is not a function` in pages that access localStorage during static generation. Use `typeof window !== "undefined"` guards or dynamic imports to fix.
- The deployed contract on Base Sepolia uses the OLD contract without Schnorr verification. A redeployment is needed.
