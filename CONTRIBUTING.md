# Contributing to Nostreum

Thanks for your interest in contributing to Nostreum.

## Project Overview

Nostreum is an on-chain identity bridge between Ethereum and Nostr, built on Scaffold-ETH 2. It consists of two packages:

- **`packages/hardhat`** - Smart contracts (NostrLinkr with BIP-340 Schnorr verification)
- **`packages/nextjs`** - Frontend (Nostr social client with identity bridge UI)

## Getting Started

```bash
git clone https://github.com/VincenzoImp/nostreum-v2.git
cd nostreum-v2
yarn install
yarn chain    # Terminal 1
yarn deploy   # Terminal 2
yarn start    # Terminal 3
```

## Development Workflow

### Code Style
- Prettier for formatting (with Solidity plugin)
- ESLint with Next.js config
- Pre-commit hooks via Husky + lint-staged

```bash
yarn format   # Run Prettier
yarn lint     # Run ESLint
```

### Testing

```bash
yarn hardhat:test         # 22 contract tests
yarn hardhat:check-types  # Hardhat TypeScript check
yarn next:check-types     # Next.js TypeScript check
```

### Architecture Conventions

- All frontend pages use `"use client"` directive
- Path alias: `~~/*` maps to `packages/nextjs/`
- Contract interactions use `useScaffoldReadContract` / `useScaffoldWriteContract`
- Nostr hooks go in `hooks/nostr/`, bridge hooks in `hooks/bridge/`
- Shared UI components go in `components/shared/`
- Feed components go in `components/feed/`
- Layout components go in `components/layout/`
- External images use `<img>` tags (not `next/image`) with eslint-disable comment
- Glass morphism design: use `glass-card` and `glass-card-hover` CSS classes

### Smart Contract Changes

If you modify `NostrLinkr.sol`:
1. Run `yarn hardhat:compile`
2. Update/add tests in `NostrLinkr.test.ts`
3. Run `yarn hardhat:test` and ensure all tests pass
4. Redeploy with `yarn deploy`

## How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Run tests and type checks
5. Commit with a clear message
6. Push to your fork
7. Open a Pull Request

### Pull Request Guidelines

- Keep PRs focused on a single change
- Include a clear description of what and why
- Ensure all tests pass
- Follow existing code conventions
- Update documentation if needed

## Reporting Issues

Open an issue with:
- Clear description of the problem or feature request
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Environment details (OS, Node version, browser)
