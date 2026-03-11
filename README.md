# Nostreum

[![CI](https://github.com/VincenzoImp/nostreum/actions/workflows/ci.yml/badge.svg)](https://github.com/VincenzoImp/nostreum/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/demo-nostreum.vercel.app-purple)](https://nostreum.vercel.app)

Nostr social client with on-chain Ethereum identity verification, powered by [nostr-linkr](https://github.com/VincenzoImp/nostr-linkr).

## Features

### Identity Bridge
- On-chain BIP-340 Schnorr signature verification via [NostrLinkr](https://github.com/VincenzoImp/nostr-linkr) smart contract
- Bidirectional lookup: Nostr pubkey ↔ Ethereum address
- Verified badges on profiles with proven on-chain links

### Nostr Social Client
- Real-time global feed from Nostr relays with event signature validation
- Following feed with localStorage-backed follow lists
- Compose and publish signed text notes (kind 1)
- Like/react to posts (kind 7)
- Profile pages with avatar, banner, bio, website, Lightning address
- Cross-platform profile search by hex pubkey or Ethereum address

## Contract

**Base Sepolia:** [`0xbC379bEFBAA269AfC2a1891438A7b8737E79A476`](https://sepolia.basescan.org/address/0xbC379bEFBAA269AfC2a1891438A7b8737E79A476#code)

The NostrLinkr contract is developed and maintained in the [nostr-linkr](https://github.com/VincenzoImp/nostr-linkr) repository.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router), React 19, TypeScript 5.8 |
| Web3 | wagmi 2.x, viem 2.x, RainbowKit 2.x |
| Identity | [nostr-linkr](https://www.npmjs.com/package/nostr-linkr) SDK |
| Nostr | nostr-tools 2.x, WebSocket |
| Styling | Tailwind CSS 4, DaisyUI 5 |
| State | React Context, localStorage |

## Getting Started

### Prerequisites
- Node.js >= 20
- Yarn
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
yarn dev
```

Open http://localhost:3000

### Production Build

```bash
yarn build
```

## Environment Variables

```env
# packages/nextjs/.env.local
NEXT_PUBLIC_ALCHEMY_API_KEY=
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=
```

Defaults are provided in config files for local development.

## Nostr Relays

Default relay: `wss://relay.damus.io`

Fallbacks: `wss://nos.lol`, `wss://relay.nostr.band`, `wss://nostr-pub.wellorder.net`

Auto-reconnect with exponential backoff (max 5 attempts). All incoming events are validated with `nostr-tools.verifyEvent()`.

## Links

- **Live Demo:** https://nostreum.vercel.app
- **Smart Contract & SDK:** https://github.com/VincenzoImp/nostr-linkr
- **Article:** https://vincenzo.imperati.dev/posts/nostreum

## License

[MIT](LICENSE)
