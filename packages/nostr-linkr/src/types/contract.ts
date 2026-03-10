import type { Address, Hash, Hex } from "viem";

/** Parameters for the pushLinkr contract call. */
export interface PushLinkrParams {
  id: Hash;
  pubkey: Hash;
  createdAt: bigint;
  kind: bigint;
  tags: string;
  content: string;
  sig: Hex;
}

/** Result of an identity link query. */
export interface IdentityLink {
  ethereumAddress: Address;
  nostrPubkey: string;
  linked: boolean;
}

/** Result of a batch identity lookup. */
export interface BatchLookupResult {
  results: Map<string, Address | string | null>;
  errors: Map<string, Error>;
}

/** A decoded LinkrPushed or LinkrPulled contract event log. */
export interface LinkrEventLog {
  eventName: "LinkrPushed" | "LinkrPulled";
  address: Address;
  pubkey: Hash;
  blockNumber: bigint;
  transactionHash: Hash;
  logIndex: number;
}

/** Filter for querying LinkrPushed/LinkrPulled events. */
export interface LinkrEventFilter {
  address?: Address;
  pubkey?: Hash;
  fromBlock?: bigint;
  toBlock?: bigint | "latest";
}
