"use client";

import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { isZeroAddress } from "~~/utils/nostr/formatting";

export function useLinkedAddress(pubkey: string | undefined) {
  const { data: ethAddress } = useScaffoldReadContract({
    contractName: "NostrLinkr",
    functionName: "pubkeyAddress",
    args: [pubkey ? (`0x${pubkey}` as `0x${string}`) : undefined],
  });

  const address = ethAddress as string | undefined;
  const hasLink = !!address && !isZeroAddress(address);

  return {
    ethAddress: hasLink ? address : undefined,
    isLinked: hasLink,
  };
}
