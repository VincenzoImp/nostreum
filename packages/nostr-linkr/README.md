# nostr-linkr

TypeScript SDK for the **NostrLinkr** smart contract — the first on-chain verification system that cryptographically links Ethereum addresses (ECDSA) with Nostr public keys (Schnorr/BIP-340).

## Features

- **Framework-agnostic** — no React, no wagmi. Just `viem`.
- **Full TypeScript types** with autocomplete and strict mode
- **Multichain support** — any EVM chain where the contract is deployed
- **Client-side event creation, hashing, and validation** — NIP-01 compliant
- **Batch queries** via `viem` multicall
- **Event watching** — real-time `LinkrPushed` / `LinkrPulled` events
- **Tree-shakeable** — ESM and CJS builds with sub-path exports
- **Zero unnecessary dependencies** — only `viem` as peer dependency

## Installation

```bash
npm install nostr-linkr viem
```

## Quick Start

### Query an Identity Link

```typescript
import { createNostrLinkrClient } from "nostr-linkr";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const linkr = createNostrLinkrClient({
  chain: baseSepolia,
  publicClient,
});

// Nostr pubkey -> Ethereum address
const ethAddress = await linkr.getEthereumAddress("3bf0c63f...");

// Ethereum address -> Nostr pubkey
const pubkey = await linkr.getNostrPubkey("0x...");

// Full link info
const link = await linkr.getLink("0x...");
// { ethereumAddress: "0x...", nostrPubkey: "3bf0...", linked: true }

// Batch lookup (single multicall RPC)
const results = await linkr.batchGetEthereumAddresses([
  "3bf0c63f...",
  "1a2b3c4d...",
  "deadbeef...",
]);
```

### Create an Identity Link

```typescript
import { createNostrLinkrClient, createAndSignLinkEvent } from "nostr-linkr";
import { createPublicClient, createWalletClient, http, custom } from "viem";
import { baseSepolia } from "viem/chains";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

const walletClient = createWalletClient({
  chain: baseSepolia,
  transport: custom(window.ethereum!),
});

const linkr = createNostrLinkrClient({
  chain: baseSepolia,
  publicClient,
  walletClient,
});

// 1. Sign with Nostr extension (NIP-07)
const [account] = await walletClient.getAddresses();
const signedEvent = await createAndSignLinkEvent(window.nostr!, account);

// 2. Submit to contract (BIP-340 Schnorr verified on-chain)
const txHash = await linkr.pushLink(signedEvent);
```

### Remove a Link

```typescript
const txHash = await linkr.pullLink();
```

### Verify a Nostr Event On-Chain

```typescript
const isValid = await linkr.verifyNostrEventOnChain(signedEvent);
```

### Watch for New Links in Real-Time

```typescript
const unwatch = linkr.watchLinkEvents((log) => {
  console.log(`${log.eventName}: ${log.address} <-> ${log.pubkey}`);
});

// Stop watching
unwatch();
```

### Query Historical Link Events

```typescript
const events = await linkr.getLinkEvents({
  fromBlock: 0n,
  toBlock: "latest",
  address: "0x...", // optional filter
});
```

### Gas Estimation

```typescript
const { gasEstimate } = await linkr.simulatePushLink(signedEvent);
console.log(`Estimated gas: ${gasEstimate}`);
```

## Event Utilities (No Contract Needed)

The event module is fully standalone — use it without a blockchain connection:

```typescript
import {
  createLinkEvent,
  hashEvent,
  hashAndPrepare,
  serializeEvent,
  validateLinkEvent,
} from "nostr-linkr/event";

// Create an unsigned linking event
const event = createLinkEvent("0xYourAddress", "nostrPubkeyHex");

// Compute NIP-01 event hash
const id = hashEvent(event);

// Get canonical JSON serialization
const json = serializeEvent(event);

// Prepare for signing (adds id)
const prepared = hashAndPrepare(event);

// Validate a signed event before submitting
const { valid, errors } = validateLinkEvent(signedEvent, "0xYourAddress");
if (!valid) console.error("Validation failed:", errors);
```

## Sub-Path Imports

Import only what you need for optimal tree-shaking:

```typescript
import { nostrLinkrAbi } from "nostr-linkr/abi";
import { createLinkEvent, hashEvent } from "nostr-linkr/event";
import { DEPLOYMENTS, NOSTR_LINKR_EVENT_KIND } from "nostr-linkr/constants";
import { pubkeyToBytes32, isValidPubkey, buildPubkeyBatchCalls } from "nostr-linkr/utils";
```

## Custom Chain Deployment

Deploy NostrLinkr on any EVM chain and point the SDK to it:

```typescript
const linkr = createNostrLinkrClient({
  chain: myCustomChain,
  publicClient,
  contractAddress: "0xYourDeploymentAddress",
});
```

## API Reference

### Client

| Method | Description |
|--------|-------------|
| `getNostrPubkey(address)` | Ethereum address -> Nostr pubkey (or `null`) |
| `getEthereumAddress(pubkey)` | Nostr pubkey -> Ethereum address (or `null`) |
| `isLinked(address)` | Check if address has a link |
| `isLinkedByPubkey(pubkey)` | Check if pubkey has a link |
| `getLink(address)` | Full `IdentityLink` object |
| `getLinkByPubkey(pubkey)` | Full `IdentityLink` object |
| `batchGetEthereumAddresses(pubkeys)` | Multicall batch lookup |
| `batchGetNostrPubkeys(addresses)` | Multicall batch lookup |
| `verifyNostrEventOnChain(event)` | On-chain BIP-340 verification |
| `getEventHashOnChain(event)` | On-chain NIP-01 hash computation |
| `isPaused()` | Contract pause status |
| `getOwner()` | Contract owner address |
| `getLinkEvents(filter?)` | Query historical log events |
| `watchLinkEvents(callback, filter?)` | Real-time event watching |
| `pushLink(signedEvent)` | Submit identity link (requires walletClient) |
| `pullLink()` | Remove identity link (requires walletClient) |
| `simulatePushLink(signedEvent)` | Simulate + gas estimate |
| `simulatePullLink()` | Simulate + gas estimate |

### Event Utilities

| Function | Description |
|----------|-------------|
| `createLinkEvent(address, pubkey, timestamp?)` | Create unsigned linking event |
| `serializeEvent(event)` | NIP-01 canonical JSON |
| `hashEvent(event)` | SHA-256 event hash (64-char hex) |
| `hashAndPrepare(event)` | Hash + attach id |
| `validateLinkEvent(event, signerAddress?)` | Pre-flight validation |
| `createAndSignLinkEvent(signer, address)` | Full flow with NIP-07 signer |

### Utility Functions

| Function | Description |
|----------|-------------|
| `pubkeyToBytes32(pubkey)` | 64-char hex -> 0x bytes32 |
| `bytes32ToPubkey(bytes32)` | 0x bytes32 -> 64-char hex (or null) |
| `sigToHex(sig)` | Add 0x prefix to signature |
| `isValidPubkey(value)` | Validate 64-char lowercase hex |
| `isValidSchnorrSig(value)` | Validate 128-char lowercase hex |
| `addressToContent(address)` | Format address as contract content |
| `isValidAddressContent(content)` | Validate content format |
| `isTimestampValid(createdAt, ref?)` | Check contract timestamp bounds |
| `buildPubkeyBatchCalls(addr, pubkeys)` | Build multicall for pubkeys |
| `buildAddressBatchCalls(addr, addrs)` | Build multicall for addresses |

## How It Works

1. A Nostr browser extension signs a **kind:27235** event containing the Ethereum address (no `0x` prefix)
2. The signed event is submitted to the **NostrLinkr** smart contract with all NIP-01 parameters
3. The contract computes the **SHA-256 event hash** matching NIP-01 canonical serialization
4. **BIP-340 Schnorr signature** is verified on-chain using the MODEXP precompile
5. A **bidirectional mapping** (address <-> pubkey) is stored on-chain

## NIP Compatibility

- **NIP-01**: Event serialization and hashing follows the canonical format exactly
- **NIP-07**: The `NostrSigner` interface is compatible with browser extensions (Alby, nos2x)
- **Kind 27235**: Custom event kind for identity linking

## License

MIT
