import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

export const useEthereumAddress = (pubkey: string) => {
  const { data: ethereumAddress } = useScaffoldReadContract({
    contractName: "NostrLinkr",
    functionName: "pubkeyAddress",
    args: [pubkey ? (`0x${pubkey}` as `0x${string}`) : undefined],
  });
  return ethereumAddress;
};
