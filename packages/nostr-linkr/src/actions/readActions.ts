import type { Address, Hash, PublicClient, Transport, Chain } from "viem";
import { nostrLinkrAbi } from "../abi/index.js";
import type {
  NostrEvent,
  UnsignedNostrEvent,
  IdentityLink,
  BatchLookupResult,
  LinkrEventLog,
  LinkrEventFilter,
} from "../types/index.js";
import { pubkeyToBytes32, bytes32ToPubkey, sigToHex } from "../utils/hex.js";
import { isZeroAddress } from "../utils/address.js";
import { buildPubkeyBatchCalls, buildAddressBatchCalls } from "../utils/multicall.js";

const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000" as Hash;

export function createReadActions(
  publicClient: PublicClient<Transport, Chain>,
  contractAddress: Address,
) {
  async function getNostrPubkey(address: Address): Promise<string | null> {
    const result = await publicClient.readContract({
      address: contractAddress,
      abi: nostrLinkrAbi,
      functionName: "addressPubkey",
      args: [address],
    });
    return bytes32ToPubkey(result as Hash);
  }

  async function getEthereumAddress(pubkey: string): Promise<Address | null> {
    const result = await publicClient.readContract({
      address: contractAddress,
      abi: nostrLinkrAbi,
      functionName: "pubkeyAddress",
      args: [pubkeyToBytes32(pubkey)],
    });
    const addr = result as Address;
    return isZeroAddress(addr) ? null : addr;
  }

  async function isLinked(address: Address): Promise<boolean> {
    const pubkey = await getNostrPubkey(address);
    return pubkey !== null;
  }

  async function isLinkedByPubkey(pubkey: string): Promise<boolean> {
    const addr = await getEthereumAddress(pubkey);
    return addr !== null;
  }

  async function getLink(address: Address): Promise<IdentityLink> {
    const pubkey = await getNostrPubkey(address);
    return {
      ethereumAddress: address,
      nostrPubkey: pubkey ?? "",
      linked: pubkey !== null,
    };
  }

  async function getLinkByPubkey(pubkey: string): Promise<IdentityLink> {
    const addr = await getEthereumAddress(pubkey);
    return {
      ethereumAddress: addr ?? ("0x0000000000000000000000000000000000000000" as Address),
      nostrPubkey: pubkey,
      linked: addr !== null,
    };
  }

  async function batchGetEthereumAddresses(pubkeys: string[]): Promise<BatchLookupResult> {
    const results = new Map<string, Address | string | null>();
    const errors = new Map<string, Error>();

    if (pubkeys.length === 0) return { results, errors };

    const calls = buildPubkeyBatchCalls(contractAddress, pubkeys);
    const multicallResults = await publicClient.multicall({ contracts: calls });

    for (let i = 0; i < pubkeys.length; i++) {
      const r = multicallResults[i];
      if (r.status === "success") {
        const addr = r.result as Address;
        results.set(pubkeys[i], isZeroAddress(addr) ? null : addr);
      } else {
        errors.set(pubkeys[i], r.error as Error);
      }
    }

    return { results, errors };
  }

  async function batchGetNostrPubkeys(addresses: Address[]): Promise<BatchLookupResult> {
    const results = new Map<string, Address | string | null>();
    const errors = new Map<string, Error>();

    if (addresses.length === 0) return { results, errors };

    const calls = buildAddressBatchCalls(contractAddress, addresses);
    const multicallResults = await publicClient.multicall({ contracts: calls });

    for (let i = 0; i < addresses.length; i++) {
      const r = multicallResults[i];
      if (r.status === "success") {
        results.set(addresses[i], bytes32ToPubkey(r.result as Hash));
      } else {
        errors.set(addresses[i], r.error as Error);
      }
    }

    return { results, errors };
  }

  async function verifyNostrEventOnChain(event: NostrEvent): Promise<boolean> {
    const result = await publicClient.readContract({
      address: contractAddress,
      abi: nostrLinkrAbi,
      functionName: "verifyNostrEvent",
      args: [
        pubkeyToBytes32(event.id) as Hash,
        pubkeyToBytes32(event.pubkey) as Hash,
        BigInt(event.created_at),
        BigInt(event.kind),
        JSON.stringify(event.tags),
        event.content,
        sigToHex(event.sig),
      ],
    });
    return result as boolean;
  }

  async function getEventHashOnChain(event: UnsignedNostrEvent): Promise<Hash> {
    const result = await publicClient.readContract({
      address: contractAddress,
      abi: nostrLinkrAbi,
      functionName: "getEventHash",
      args: [
        pubkeyToBytes32(event.pubkey) as Hash,
        BigInt(event.created_at),
        BigInt(event.kind),
        JSON.stringify(event.tags),
        event.content,
      ],
    });
    return result as Hash;
  }

  async function isPaused(): Promise<boolean> {
    const result = await publicClient.readContract({
      address: contractAddress,
      abi: nostrLinkrAbi,
      functionName: "paused",
    });
    return result as boolean;
  }

  async function getOwner(): Promise<Address> {
    const result = await publicClient.readContract({
      address: contractAddress,
      abi: nostrLinkrAbi,
      functionName: "owner",
    });
    return result as Address;
  }

  async function getLinkEvents(filter?: LinkrEventFilter): Promise<LinkrEventLog[]> {
    const [pushedLogs, pulledLogs] = await Promise.all([
      publicClient.getLogs({
        address: contractAddress,
        event: {
          type: "event",
          name: "LinkrPushed",
          inputs: [
            { indexed: true, name: "addr", type: "address" },
            { indexed: true, name: "pubkey", type: "bytes32" },
          ],
        },
        args: {
          addr: filter?.address,
          pubkey: filter?.pubkey,
        },
        fromBlock: filter?.fromBlock ?? 0n,
        toBlock: filter?.toBlock ?? "latest",
      }),
      publicClient.getLogs({
        address: contractAddress,
        event: {
          type: "event",
          name: "LinkrPulled",
          inputs: [
            { indexed: true, name: "addr", type: "address" },
            { indexed: true, name: "pubkey", type: "bytes32" },
          ],
        },
        args: {
          addr: filter?.address,
          pubkey: filter?.pubkey,
        },
        fromBlock: filter?.fromBlock ?? 0n,
        toBlock: filter?.toBlock ?? "latest",
      }),
    ]);

    const events: LinkrEventLog[] = [
      ...pushedLogs.map((log) => ({
        eventName: "LinkrPushed" as const,
        address: (log.args as { addr: Address }).addr,
        pubkey: ((log.args as { pubkey: Hash }).pubkey ?? ZERO_BYTES32) as Hash,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        logIndex: log.logIndex,
      })),
      ...pulledLogs.map((log) => ({
        eventName: "LinkrPulled" as const,
        address: (log.args as { addr: Address }).addr,
        pubkey: ((log.args as { pubkey: Hash }).pubkey ?? ZERO_BYTES32) as Hash,
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
        logIndex: log.logIndex,
      })),
    ];

    return events.sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) return Number(a.blockNumber - b.blockNumber);
      return a.logIndex - b.logIndex;
    });
  }

  function watchLinkEvents(
    callback: (log: LinkrEventLog) => void,
    filter?: { address?: Address; pubkey?: Hash },
  ): () => void {
    const unwatchPushed = publicClient.watchEvent({
      address: contractAddress,
      event: {
        type: "event",
        name: "LinkrPushed",
        inputs: [
          { indexed: true, name: "addr", type: "address" },
          { indexed: true, name: "pubkey", type: "bytes32" },
        ],
      },
      args: {
        addr: filter?.address,
        pubkey: filter?.pubkey,
      },
      onLogs: (logs) => {
        for (const log of logs) {
          callback({
            eventName: "LinkrPushed",
            address: (log.args as { addr: Address }).addr,
            pubkey: ((log.args as { pubkey: Hash }).pubkey ?? ZERO_BYTES32) as Hash,
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            logIndex: log.logIndex,
          });
        }
      },
    });

    const unwatchPulled = publicClient.watchEvent({
      address: contractAddress,
      event: {
        type: "event",
        name: "LinkrPulled",
        inputs: [
          { indexed: true, name: "addr", type: "address" },
          { indexed: true, name: "pubkey", type: "bytes32" },
        ],
      },
      args: {
        addr: filter?.address,
        pubkey: filter?.pubkey,
      },
      onLogs: (logs) => {
        for (const log of logs) {
          callback({
            eventName: "LinkrPulled",
            address: (log.args as { addr: Address }).addr,
            pubkey: ((log.args as { pubkey: Hash }).pubkey ?? ZERO_BYTES32) as Hash,
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            logIndex: log.logIndex,
          });
        }
      },
    });

    return () => {
      unwatchPushed();
      unwatchPulled();
    };
  }

  return {
    getNostrPubkey,
    getEthereumAddress,
    isLinked,
    isLinkedByPubkey,
    getLink,
    getLinkByPubkey,
    batchGetEthereumAddresses,
    batchGetNostrPubkeys,
    verifyNostrEventOnChain,
    getEventHashOnChain,
    isPaused,
    getOwner,
    getLinkEvents,
    watchLinkEvents,
  };
}
