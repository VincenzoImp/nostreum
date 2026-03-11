import type { Address, Hash, WalletClient, PublicClient, Transport, Chain } from "viem";
import { nostrLinkrAbi } from "../abi/index.js";
import type { NostrEvent } from "../types/index.js";
import { pubkeyToBytes32, sigToHex } from "../utils/hex.js";
import { NoWalletClientError } from "../errors/index.js";

export function createWriteActions(
  publicClient: PublicClient<Transport, Chain>,
  contractAddress: Address,
  walletClient?: WalletClient<Transport, Chain>,
) {
  function requireWallet(): WalletClient<Transport, Chain> {
    if (!walletClient) throw new NoWalletClientError();
    return walletClient;
  }

  async function pushLink(signedEvent: NostrEvent): Promise<Hash> {
    const wc = requireWallet();
    const [account] = await wc.getAddresses();

    const { request } = await publicClient.simulateContract({
      account,
      address: contractAddress,
      abi: nostrLinkrAbi,
      functionName: "pushLinkr",
      args: [
        pubkeyToBytes32(signedEvent.id) as Hash,
        pubkeyToBytes32(signedEvent.pubkey) as Hash,
        BigInt(signedEvent.created_at),
        BigInt(signedEvent.kind),
        JSON.stringify(signedEvent.tags),
        signedEvent.content,
        sigToHex(signedEvent.sig),
      ],
    });

    return wc.writeContract(request);
  }

  async function pullLink(): Promise<Hash> {
    const wc = requireWallet();
    const [account] = await wc.getAddresses();

    const { request } = await publicClient.simulateContract({
      account,
      address: contractAddress,
      abi: nostrLinkrAbi,
      functionName: "pullLinkr",
    });

    return wc.writeContract(request);
  }

  async function simulatePushLink(signedEvent: NostrEvent) {
    const wc = requireWallet();
    const [account] = await wc.getAddresses();

    const { request } = await publicClient.simulateContract({
      account,
      address: contractAddress,
      abi: nostrLinkrAbi,
      functionName: "pushLinkr",
      args: [
        pubkeyToBytes32(signedEvent.id) as Hash,
        pubkeyToBytes32(signedEvent.pubkey) as Hash,
        BigInt(signedEvent.created_at),
        BigInt(signedEvent.kind),
        JSON.stringify(signedEvent.tags),
        signedEvent.content,
        sigToHex(signedEvent.sig),
      ],
    });

    const gasEstimate = await publicClient.estimateContractGas({
      account,
      address: contractAddress,
      abi: nostrLinkrAbi,
      functionName: "pushLinkr",
      args: [
        pubkeyToBytes32(signedEvent.id) as Hash,
        pubkeyToBytes32(signedEvent.pubkey) as Hash,
        BigInt(signedEvent.created_at),
        BigInt(signedEvent.kind),
        JSON.stringify(signedEvent.tags),
        signedEvent.content,
        sigToHex(signedEvent.sig),
      ],
    });

    return { request, gasEstimate };
  }

  async function simulatePullLink() {
    const wc = requireWallet();
    const [account] = await wc.getAddresses();

    const { request } = await publicClient.simulateContract({
      account,
      address: contractAddress,
      abi: nostrLinkrAbi,
      functionName: "pullLinkr",
    });

    const gasEstimate = await publicClient.estimateContractGas({
      account,
      address: contractAddress,
      abi: nostrLinkrAbi,
      functionName: "pullLinkr",
    });

    return { request, gasEstimate };
  }

  return {
    pushLink,
    pullLink,
    simulatePushLink,
    simulatePullLink,
  };
}
