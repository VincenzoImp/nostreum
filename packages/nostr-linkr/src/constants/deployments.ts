import type { Address } from "viem";
import type { DeploymentInfo } from "../types/index.js";

/** Known NostrLinkr contract deployments indexed by chainId. */
export const DEPLOYMENTS: Record<number, DeploymentInfo> = {
  31337: {
    address: "0x5FbDB2315678afecb367f032d93F642f64180aa3" as Address,
    chainId: 31337,
    chainName: "Hardhat",
  },
  84532: {
    address: "0x0000000000000000000000000000000000000000" as Address, // TODO: update after deployment
    chainId: 84532,
    chainName: "Base Sepolia",
    blockExplorerUrl: "https://sepolia.basescan.org",
  },
};

/** Get deployment info for a chain, or undefined if not deployed. */
export function getDeployment(chainId: number): DeploymentInfo | undefined {
  return DEPLOYMENTS[chainId];
}

/** Get all supported chain IDs. */
export function getSupportedChainIds(): number[] {
  return Object.keys(DEPLOYMENTS).map(Number);
}
