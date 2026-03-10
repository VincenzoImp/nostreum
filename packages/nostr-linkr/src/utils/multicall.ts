import type { Address, Hash } from "viem";
import { nostrLinkrAbi } from "../abi/index.js";
import { pubkeyToBytes32 } from "./hex.js";

/**
 * Build a viem multicall batch for resolving multiple pubkeys to addresses.
 */
export function buildPubkeyBatchCalls(
  contractAddress: Address,
  pubkeys: string[],
) {
  return pubkeys.map((pk) => ({
    address: contractAddress,
    abi: nostrLinkrAbi,
    functionName: "pubkeyAddress" as const,
    args: [pubkeyToBytes32(pk)] as [Hash],
  }));
}

/**
 * Build a viem multicall batch for resolving multiple addresses to pubkeys.
 */
export function buildAddressBatchCalls(
  contractAddress: Address,
  addresses: Address[],
) {
  return addresses.map((addr) => ({
    address: contractAddress,
    abi: nostrLinkrAbi,
    functionName: "addressPubkey" as const,
    args: [addr] as [Address],
  }));
}
