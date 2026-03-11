# Nostreum

> The first on-chain identity bridge between Ethereum and Nostr

Nostreum cryptographically links Ethereum addresses (ECDSA) with Nostr public keys (Schnorr/BIP-340) through smart contract verification. It combines a full Nostr social client with on-chain identity verification, creating a bridge between Ethereum's financial ecosystem and Nostr's decentralized social network.

## How It Works

```
Ethereum Wallet  -->  Sign Nostr Event (kind 27235)  -->  On-Chain BIP-340 Verification  -->  Bidirectional Mapping
   (ECDSA)               (Schnorr/BIP-340)                    (MODEXP precompile)            addressPubkey / pubkeyAddress
```

1. User connects Ethereum wallet and Nostr extension (Alby, nos2x)
2. Nostr extension signs a kind 27235 event containing the Ethereum address
3. Smart contract verifies the BIP-340 Schnorr signature on-chain using the MODEXP precompile
4. Bidirectional mapping is stored: Ethereum address <-> Nostr public key

## Features

### Identity Bridge
- Full on-chain BIP-340 Schnorr signature verification
- Bidirectional lookup: find Nostr identity from ETH address and vice versa
- Verified badges on profiles with proven on-chain links
- Owner-controlled pause/unpause for emergency stops

### Nostr Social Client
- Real-time global feed from Nostr relays with event signature validation
- Following feed with localStorage-backed follow lists
- Compose and publish signed text notes (kind 1)
- Like/react to posts (kind 7)
- Profile pages with avatar, banner, bio, website, Lightning address
- Cross-platform profile search by hex pubkey or Ethereum address

## Smart Contract: NostrLinkr

Solidity 0.8.30 with OpenZeppelin Ownable + Pausable.

| Function | Description |
|---|---|
| `pushLinkr(id, pubkey, createdAt, kind, tags, content, sig)` | Create identity link with full Schnorr verification |
| `pullLinkr()` | Remove caller's identity link |
| `verifyNostrEvent(...)` | Verify Nostr event hash + Schnorr signature (view) |
| `getEventHash(...)` | Compute NIP-01 compliant event hash |
| `addressPubkey(address)` | Lookup: Ethereum address -> Nostr pubkey |
| `pubkeyAddress(bytes32)` | Lookup: Nostr pubkey -> Ethereum address |

**Deployed on Base Sepolia:** [`0x0246B2Eb1716445B1d3bA4d86aA7F3Dcb2505948`](https://sepolia.basescan.org/address/0x0246B2Eb1716445B1d3bA4d86aA7F3Dcb2505948#code)

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Solidity 0.8.30, Hardhat 2.28, OpenZeppelin, hardhat-deploy |
| Frontend | Next.js 15 (App Router), React 19, TypeScript 5.8 |
| Web3 | wagmi 2.x, viem 2.x, RainbowKit 2.x |
| Nostr | nostr-tools 2.x (event hashing, signature verification), WebSocket |
| Styling | Tailwind CSS 4, DaisyUI 5, glass morphism design system |
| State | React Context (Nostr, Following, ProfileCache), localStorage |
| Package Manager | Yarn 3.2 (workspaces) |

## Project Structure

```
packages/
  hardhat/
    contracts/NostrLinkr.sol       # Core contract with BIP-340 Schnorr verification
    deploy/                        # Deployment scripts
    test/NostrLinkr.test.ts        # 22 contract tests
    deployments/baseSepolia/       # Deployed contract artifacts
  nextjs/
    app/
      page.tsx                     # Landing page
      feed/page.tsx                # Global Nostr feed
      feed/following/page.tsx      # Following-only feed
      bridge/page.tsx              # Identity linking interface
      profile/page.tsx             # Profile search
      profile/[identifier]/page.tsx # Profile detail (pubkey or ETH address)
    components/
      feed/                        # EventCard, FeedTabs, ComposeModal, NoteContent
      layout/                      # Header, MobileNav, NavTabs, Logo, ThemeToggle
      shared/                      # Avatar, VerifiedBadge, EmptyState, SkeletonCard, ConnectionIndicator
      scaffold-eth/                # RainbowKit wallet UI, BlockieAvatar
    contexts/
      NostrContext.tsx              # WebSocket relay management, subscribe/publish
      FollowingContext.tsx          # Follow state with localStorage persistence
      ProfileCacheContext.tsx       # Batch profile fetching and caching
    hooks/
      nostr/useFeed.ts             # Feed subscription with profile batching
      nostr/useProfileDetail.ts    # Single-user profile + posts
      bridge/useLinkStatus.ts      # Current user's link status
      bridge/useLinkedAddress.ts   # Pubkey -> ETH address lookup
      scaffold-eth/                # Contract interaction hooks
    utils/nostr/                   # Formatting, parsing utilities
```

## Getting Started

### Prerequisites
- Node.js >= 20
- Yarn
- Git
- Ethereum wallet browser extension (MetaMask)
- Nostr browser extension (Alby, nos2x) for identity linking

### Installation

```bash
git clone https://github.com/VincenzoImp/nostreum.git
cd nostreum
yarn install
```

### Development

```bash
# Terminal 1: Start local Hardhat node
yarn chain

# Terminal 2: Deploy contracts
yarn deploy

# Terminal 3: Start Next.js dev server
yarn start
```

Open `http://localhost:3000`

### Testing

```bash
# Run all 22 contract tests
yarn hardhat:test

# TypeScript checks
yarn hardhat:check-types
yarn next:check-types
```

### Production Build

```bash
yarn next:build
```

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

Defaults are provided in config files for local development.

## Nostr Relay Configuration

Default relay: `wss://relay.damus.io`

Fallbacks: `wss://nos.lol`, `wss://relay.nostr.band`, `wss://nostr-pub.wellorder.net`

Auto-reconnect with exponential backoff (max 5 attempts). All incoming events are validated with `nostr-tools.verifyEvent()` before processing.

## Links

- **Live Demo (Base Sepolia):** https://nostreum.vercel.app
- **Article:** https://vincenzo.imperati.dev/posts/nostreum
- **GitHub:** https://github.com/VincenzoImp/nostreum

## License

MIT
