# Nostreum

> The first on-chain identity bridge between Ethereum and Nostr

Nostreum cryptographically links Ethereum addresses (ECDSA) with Nostr public keys (Schnorr/BIP-340) through smart contract verification. It creates a provable bridge between Ethereum's financial ecosystem and Nostr's decentralized social network.

## Core Innovation

### On-Chain Cryptographic Key Linking

Nostreum enables on-chain verification of the link between an Ethereum private key (ECDSA) and a Nostr private key (Schnorr/BIP-340), using the MODEXP precompile for modular arithmetic.

```
Ethereum (ECDSA)  <-->  Smart Contract (BIP-340 Verification)  <-->  Nostr (Schnorr)
```

This creates bidirectional, cryptographically verified mappings stored on-chain:
- `addressPubkey`: Ethereum address -> Nostr public key
- `pubkeyAddress`: Nostr public key -> Ethereum address

## Features

### Identity Bridge
- Full on-chain BIP-340 Schnorr signature verification
- Bidirectional lookup between Ethereum addresses and Nostr public keys
- Verified badges on profiles with proven on-chain links
- Owner-controlled pause/unpause for emergency stops

### Nostr Social Client
- Real-time global feed from Nostr relays
- Following feed with localStorage-backed follow lists
- Compose and publish cryptographically signed text notes
- Profile pages with avatar, bio, and ETH verification badges
- Cross-platform profile search by hex pubkey or Ethereum address

### Unlocked Use Cases

**Social -> Financial**
- Leverage Nostr social reputation for DeFi access
- Community-driven funding based on social credibility
- Reputation-based financial trust

**Financial -> Social**
- Display on-chain achievements (NFTs, DeFi activity) in social profiles
- Ethereum activity as social proof
- Cross-platform reputation building

**Real-World Impact**
- Activists receive financial support via Ethereum while communicating on censorship-resistant Nostr
- Content creators monetize through Ethereum while building audience on Nostr
- Political refugees access crypto funding while communicating safely

## Smart Contract: NostrLinkr

Solidity ^0.8.20 with OpenZeppelin Ownable + Pausable.

| Function | Description |
|---|---|
| `pushLinkr(id, pubkey, createdAt, kind, tags, content, sig)` | Create identity link with Schnorr verification |
| `pullLinkr()` | Remove caller's identity link |
| `verifyNostrEvent(...)` | Verify Nostr event hash + Schnorr signature (view) |
| `getEventHash(...)` | Compute NIP-01 compliant event hash |
| `addressPubkey(address)` | Lookup: ETH address -> Nostr pubkey |
| `pubkeyAddress(bytes32)` | Lookup: Nostr pubkey -> ETH address |

**Deployed on Base Sepolia**

## Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Solidity, Hardhat, OpenZeppelin, hardhat-deploy |
| Frontend | Next.js 15 (App Router), React 19, TypeScript 5.8 |
| Web3 | wagmi 2.x, viem 2.x, RainbowKit 2.x |
| Nostr | nostr-tools 2.x, WebSocket relay connections |
| Styling | Tailwind CSS 4, DaisyUI 5 |
| State | Zustand, React Query, localStorage |
| Package Manager | Yarn 3.2 (workspaces) |

## Getting Started

### Prerequisites
- Node.js >= 20
- Yarn
- Git
- Ethereum wallet extension (MetaMask)
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
# Run contract tests (22 tests)
yarn workspace @se-2/hardhat hardhat test --network hardhat
```

### Production

```bash
yarn next:build
```

## Nostr Relay Configuration

Default relay: `wss://relay.damus.io`

Fallbacks: `wss://nos.lol`, `wss://relay.nostr.band`, `wss://nostr-pub.wellorder.net`

Auto-reconnect with exponential backoff. All events validated with `nostr-tools.verifyEvent()`.

## Future Vision

- Multi-chain support (extend linking to other blockchains)
- NFT gallery integration in Nostr profiles
- DeFi activity badges
- Advanced social finance (reputation-based lending)
- Cross-platform DAO governance

Note: Schnorr signatures also function as Bitcoin addresses, making this potentially a three-way bridge: **Bitcoin <-> Nostr <-> Ethereum**

## Links

- **Live Demo (Base Sepolia):** https://nostreum.vercel.app
- **Article:** https://vincenzo.imperati.dev/posts/nostreum
- **GitHub:** https://github.com/VincenzoImp/nostreum
- **Presentation:** https://github.com/VincenzoImp/nostreum/blob/main/PRESENTATION.html

## License

MIT
