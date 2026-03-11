# CLAUDE.md

## Project Overview

**Nostreum** is the first on-chain identity verification system linking Ethereum addresses (ECDSA) with Nostr public keys (Schnorr/BIP-340). Built on Scaffold-ETH 2. Full Nostr social client with identity bridge.

**Live:** https://nostreum.vercel.app (Base Sepolia)

## Repository Structure

```
packages/
  hardhat/
    contracts/NostrLinkr.sol          # Core contract, BIP-340 Schnorr verification
    deploy/00_deploy_your_contract.ts
    test/NostrLinkr.test.ts           # 22 tests
    deployments/baseSepolia/          # Deployed at 0xB2E3da5028AEBe3896470C7EE91a75a8f2ca0806
  nextjs/
    app/
      page.tsx                        # Landing page (hero, features)
      feed/page.tsx                   # Global Nostr feed
      feed/following/page.tsx         # Following-only feed
      bridge/page.tsx                 # Identity linking UI
      profile/page.tsx                # Profile search (pubkey or ETH address)
      profile/[identifier]/page.tsx   # Profile detail page
    components/
      feed/                           # EventCard, FeedTabs, ComposeModal, NoteContent
      layout/                         # Header, MobileNav, NavTabs, Logo, ThemeToggle
      shared/                         # Avatar, VerifiedBadge, EmptyState, SkeletonCard, ConnectionIndicator
      scaffold-eth/                   # RainbowKit wallet, BlockieAvatar
    contexts/
      NostrContext.tsx                 # WebSocket relay management, subscribe/publish
      FollowingContext.tsx             # Follow state, localStorage persistence
      ProfileCacheContext.tsx          # Batch profile fetching + cache
    hooks/
      nostr/useFeed.ts                # Feed subscription with profile batching
      nostr/useProfileDetail.ts       # Single profile + posts (kind 0, 1)
      bridge/useLinkStatus.ts         # Current user link status via addressPubkey
      bridge/useLinkedAddress.ts      # Pubkey -> ETH address via pubkeyAddress
      scaffold-eth/                   # Contract interaction hooks
    utils/nostr/                      # formatting.ts (truncate, isHex, etc.), parsing.ts
    types/nostr.ts                    # NostrEvent, AuthorProfile, Window.nostr
    styles/globals.css                # Tailwind 4 + DaisyUI 5 themes, glass-card, animations
```

## Commands

```bash
yarn install          # Install all dependencies
yarn chain            # Start local Hardhat node
yarn deploy           # Deploy contracts
yarn start            # Start Next.js dev server (port 3000)
yarn format           # Format with Prettier
yarn lint             # ESLint
yarn hardhat:test     # Run 22 contract tests (uses --network hardhat)
yarn hardhat:compile  # Compile contracts
yarn next:build       # Production build
```

## Smart Contract: NostrLinkr

- **Solidity 0.8.30** with OpenZeppelin Ownable + Pausable
- Full BIP-340 Schnorr verification using MODEXP precompile (0x05)
- Functions are `view` not `pure` due to MODEXP precompile
- Event kind 27235 for identity linking
- Bidirectional mappings: `addressPubkey(address)` / `pubkeyAddress(bytes32)`
- Timestamp validation: 5min future / 1hr past tolerance

### Key Functions
- `pushLinkr(id, pubkey, createdAt, kind, tags, content, sig)` - Create link (whenNotPaused)
- `pullLinkr()` - Remove caller's link
- `verifyNostrEvent(...)` - Verify event hash + Schnorr signature (view)
- `getEventHash(...)` - Compute NIP-01 event hash (uses `bytesToHexNoPrefix`)
- `pause()` / `unpause()` - Emergency controls (onlyOwner)

## Frontend Architecture

### Design System
- **Themes:** Custom light (purple #7C3AED primary, amber #F59E0B accent) and dark (lavender #A78BFA, gold #FBBF24)
- **Glass morphism:** `.glass-card` and `.glass-card-hover` CSS classes
- **Animations:** fade-in, fade-in-up, scale-in, float, gradient-x, stagger-children
- **Navigation:** 3 tabs (Feed, Bridge, Profile) + mobile bottom nav

### Contexts
- `NostrContext` - WebSocket relay management with auto-reconnect, subscribe/publish, event validation via `nostr-tools.verifyEvent()`
- `FollowingContext` - Follow/unfollow with localStorage persistence (`nostr-following`)
- `ProfileCacheContext` - Batch profile fetching (kind 0) with in-memory cache

### Custom Hooks
- `useFeed(options?)` - Subscribe to kind 1 events, optional author filter, profile batch fetching
- `useProfileDetail(pubkey)` - Fetch kind 0 metadata + kind 1 posts for single user
- `useLinkStatus()` - Current wallet's link status (isLinked, linkedPubkey)
- `useLinkedAddress(pubkey)` - Reverse lookup: Nostr pubkey -> ETH address

### Nostr Relays
- Default: `wss://relay.damus.io`
- Fallbacks: `wss://nos.lol`, `wss://relay.nostr.band`, `wss://nostr-pub.wellorder.net`
- Auto-reconnect with exponential backoff (max 5 attempts)

## Tech Stack

- Hardhat 2.28, Solidity 0.8.30, ethers 6.x
- Next.js 15 (App Router), React 19, TypeScript 5.8
- wagmi 2.x, viem 2.x, RainbowKit 2.x
- Tailwind CSS 4, DaisyUI 5
- nostr-tools 2.x
- Yarn 3.2 workspaces

## Code Conventions

- All pages use `"use client"` directive
- Path alias: `~~/*` maps to `packages/nextjs/`
- Contract hooks: `useScaffoldReadContract`, `useScaffoldWriteContract`
- External images: `<img>` with `eslint-disable @next/next/no-img-element`
- No emojis in code unless explicitly requested
- Prettier + ESLint, pre-commit via Husky + lint-staged
- `glass-card` / `glass-card-hover` for card UI (do NOT use `@apply glass-card` in other classes - Tailwind 4 limitation)
- Default target network: hardhat (configure in `scaffold.config.ts`)

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

## Known Issues

- Tailwind CSS 4: Cannot use `@apply` to reference custom classes defined with `@apply` (e.g., `@apply glass-card` inside another class won't work)
- Hardhat local node: block timestamp drifts from real time when idle. Use `evm_setNextBlockTimestamp` + `evm_mine` before testing bridge locally
- `next/dynamic` with `ssr: false` causes expected "Bail out to client-side rendering" messages in server logs (not an error)
