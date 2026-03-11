# Contributing to Nostreum

Thanks for your interest in contributing to Nostreum.

## Project Overview

Nostreum is a Nostr social client with on-chain Ethereum identity verification, powered by the [nostr-linkr](https://github.com/VincenzoImp/nostr-linkr) SDK. Built on Scaffold-ETH 2.

## Getting Started

```bash
git clone https://github.com/VincenzoImp/nostreum.git
cd nostreum
yarn install
yarn dev
```

Open http://localhost:3000

## Development Workflow

### Code Style
- Prettier for formatting
- ESLint with Next.js config
- Pre-commit hooks via Husky + lint-staged

```bash
yarn format       # Run Prettier
yarn lint         # Run ESLint
yarn check-types  # TypeScript checks
```

### Architecture Conventions

- All frontend pages use `"use client"` directive
- Path alias: `~~/*` maps to `packages/nextjs/`
- Contract interactions use `useScaffoldReadContract` / `useScaffoldWriteContract`
- Identity bridge uses `nostr-linkr` SDK (`createAndSignLinkEvent`, etc.)
- Nostr hooks go in `hooks/nostr/`, bridge hooks in `hooks/bridge/`
- Shared UI components go in `components/shared/`
- Feed components go in `components/feed/`
- Layout components go in `components/layout/`
- Glass morphism design: use `glass-card` and `glass-card-hover` CSS classes

### Smart Contract

The NostrLinkr smart contract is maintained in the [nostr-linkr](https://github.com/VincenzoImp/nostr-linkr) repository. Contract changes should be submitted there.

## How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Run `yarn lint` and `yarn check-types`
5. Commit with a clear message
6. Open a Pull Request

## Reporting Issues

Use the [bug report template](https://github.com/VincenzoImp/nostreum/issues/new?template=bug_report.yml).
