"use client";

import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { isZeroPubkey } from "~~/utils/nostr/formatting";

export function useLinkStatus() {
  const { address, isConnected } = useAccount();

  const { data: linkedPubkey, isLoading: pubkeyLoading } = useScaffoldReadContract({
    contractName: "NostrLinkr",
    functionName: "addressPubkey",
    args: [address],
  });

  const pubkeyHex = linkedPubkey ? (linkedPubkey as string) : undefined;
  const isLinked = isConnected && !!pubkeyHex && !isZeroPubkey(pubkeyHex);

  return {
    isConnected,
    address,
    isLinked,
    linkedPubkey: isLinked ? pubkeyHex!.replace("0x", "") : undefined,
    loading: pubkeyLoading,
  };
}
