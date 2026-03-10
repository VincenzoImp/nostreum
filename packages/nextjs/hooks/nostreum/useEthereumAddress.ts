import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

/**
 * Hook to read Ethereum address for a given Nostr pubkey from the NostrLinkr contract
 */
export const useEthereumAddress = (pubkey: string) => {
  const { data: ethereumAddress } = useScaffoldReadContract({
    contractName: "NostrLinkr",
    functionName: "pubkeyAddress",
    args: [pubkey ? (`0x${pubkey}` as `0x${string}`) : undefined],
  });
  return ethereumAddress;
};
