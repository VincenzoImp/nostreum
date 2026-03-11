# CLAUDE.md

## Project Overview

**Nostreum** is a Nostr social client with on-chain Ethereum identity verification. Uses the [nostr-linkr](https://github.com/VincenzoImp/nostr-linkr) SDK for smart contract interactions. Built on Scaffold-ETH 2.

**Live:** https://nostreum.vercel.app (Base Sepolia)
**Contract:** `0xbC379bEFBAA269AfC2a1891438A7b8737E79A476` on Base Sepolia

## Repository Structure

```
packages/
  nextjs/
    app/
      page.tsx                        # Landing page (hero, features)
      feed/page.tsx                   # Global Nostr feed
      feed/following/page.tsx         # Following-only feed
      bridge/page.tsx                 # Identity linking UI (uses nostr-linkr SDK)
      profile/page.tsx                # Profile search (pubkey or ETH address)
      profile/[identifier]/page.tsx   # Profile detail page
    components/
      feed/                           # EventCard, FeedTabs, ComposeModal, NoteContent
      layout/                         # Header, MobileNav, NavTabs, Logo, ThemeToggle
      shared/                         # Avatar, VerifiedBadge, EmptyState, SkeletonCard
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
    contracts/
      deployedContracts.ts            # ABI + address for Base Sepolia deployment
    utils/nostr/                      # formatting.ts, parsing.ts
    types/nostr.ts                    # NostrEvent, AuthorProfile, Window.nostr
    styles/globals.css                # Tailwind 4 + DaisyUI 5, glass-card, animations
```

## Commands

```bash
yarn install      # Install all dependencies
yarn dev          # Start Next.js dev server (port 3000)
yarn build        # Production build
yarn lint         # ESLint
yarn check-types  # TypeScript checks
yarn format       # Prettier
```

## Smart Contract Integration

The NostrLinkr contract is developed in [nostr-linkr](https://github.com/VincenzoImp/nostr-linkr). This app uses:
- `nostr-linkr` npm package for event creation/signing (`createAndSignLinkEvent`)
- Scaffold-ETH hooks (`useScaffoldReadContract`, `useScaffoldWriteContract`) for contract reads/writes
- `deployedContracts.ts` contains the ABI and Base Sepolia deployment address

## Frontend Architecture

### Design System
- **Themes:** Custom light (purple #7C3AED, amber #F59E0B) and dark (lavender #A78BFA, gold #FBBF24)
- **Glass morphism:** `.glass-card` and `.glass-card-hover` CSS classes
- **Animations:** fade-in, fade-in-up, scale-in, float, gradient-x, stagger-children
- **Navigation:** 3 tabs (Feed, Bridge, Profile) + mobile bottom nav

### Contexts
- `NostrContext` — WebSocket relay management, subscribe/publish, event validation
- `FollowingContext` — Follow/unfollow with localStorage persistence (`nostr-following`)
- `ProfileCacheContext` — Batch profile fetching (kind 0) with in-memory cache

### Custom Hooks
- `useFeed(options?)` — Subscribe to kind 1 events, optional author filter
- `useProfileDetail(pubkey)` — Fetch kind 0 metadata + kind 1 posts
- `useLinkStatus()` — Current wallet's link status (isLinked, linkedPubkey)
- `useLinkedAddress(pubkey)` — Reverse lookup: Nostr pubkey -> ETH address

## Code Conventions

- All pages use `"use client"` directive
- Path alias: `~~/*` maps to `packages/nextjs/`
- Contract hooks: `useScaffoldReadContract`, `useScaffoldWriteContract`
- External images: `<img>` with `eslint-disable @next/next/no-img-element`
- Prettier + ESLint, pre-commit via Husky + lint-staged
- `glass-card` / `glass-card-hover` for card UI (do NOT use `@apply glass-card` — Tailwind 4 limitation)
- Target network: Base Sepolia (configure in `scaffold.config.ts`)

## Environment Variables

```env
# packages/nextjs/.env.local
NEXT_PUBLIC_ALCHEMY_API_KEY=
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=
```

## Known Issues

- Tailwind CSS 4: Cannot use `@apply` to reference custom classes defined with `@apply`
- `next/dynamic` with `ssr: false` causes expected "Bail out to client-side rendering" messages in server logs (not an error)
