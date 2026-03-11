import type { Address, Hash, Chain } from "viem";
import type {
  NostrLinkrClientConfig,
  NostrEvent,
  UnsignedNostrEvent,
  IdentityLink,
  BatchLookupResult,
  LinkrEventLog,
  LinkrEventFilter,
} from "./types/index.js";
import { getDeployment } from "./constants/index.js";
import { createReadActions } from "./actions/readActions.js";
import { createWriteActions } from "./actions/writeActions.js";
import { NostrLinkrError, NostrLinkrErrorCode } from "./errors/index.js";

/** The main NostrLinkr client object. */
export interface NostrLinkrClient {
  // Read actions
  getNostrPubkey(address: Address): Promise<string | null>;
  getEthereumAddress(pubkey: string): Promise<Address | null>;
  isLinked(address: Address): Promise<boolean>;
  isLinkedByPubkey(pubkey: string): Promise<boolean>;
  getLink(address: Address): Promise<IdentityLink>;
  getLinkByPubkey(pubkey: string): Promise<IdentityLink>;
  batchGetEthereumAddresses(pubkeys: string[]): Promise<BatchLookupResult>;
  batchGetNostrPubkeys(addresses: Address[]): Promise<BatchLookupResult>;
  verifyNostrEventOnChain(event: NostrEvent): Promise<boolean>;
  getEventHashOnChain(event: UnsignedNostrEvent): Promise<Hash>;
  isPaused(): Promise<boolean>;
  getOwner(): Promise<Address>;
  getLinkEvents(filter?: LinkrEventFilter): Promise<LinkrEventLog[]>;
  watchLinkEvents(
    callback: (log: LinkrEventLog) => void,
    filter?: { address?: Address; pubkey?: Hash },
  ): () => void;

  // Write actions
  pushLink(signedEvent: NostrEvent): Promise<Hash>;
  pullLink(): Promise<Hash>;
  simulatePushLink(signedEvent: NostrEvent): Promise<{ request: unknown; gasEstimate: bigint }>;
  simulatePullLink(): Promise<{ request: unknown; gasEstimate: bigint }>;

  // Metadata
  readonly contractAddress: Address;
  readonly chain: Chain;
}

/**
 * Creates a NostrLinkrClient instance that wraps all SDK functionality.
 * Resolves the contract address from known deployments if not provided.
 *
 * @param config - Client configuration including chain, publicClient, and optional walletClient
 * @throws {NostrLinkrError} If chain has no known deployment and no contractAddress override
 */
export function createNostrLinkrClient(config: NostrLinkrClientConfig): NostrLinkrClient {
  const { chain, publicClient, walletClient } = config;

  let contractAddress = config.contractAddress;
  if (!contractAddress) {
    const deployment = getDeployment(chain.id);
    if (!deployment) {
      throw new NostrLinkrError(
        `No known deployment for chain ${chain.name} (id: ${chain.id}). Pass contractAddress explicitly.`,
        NostrLinkrErrorCode.NO_DEPLOYMENT,
      );
    }
    contractAddress = deployment.address;
  }

  const readActions = createReadActions(publicClient, contractAddress);
  const writeActions = createWriteActions(publicClient, contractAddress, walletClient);

  return {
    ...readActions,
    ...writeActions,
    contractAddress,
    chain,
  };
}
