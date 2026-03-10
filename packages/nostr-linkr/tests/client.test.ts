import { describe, it, expect } from "vitest";
import {
  createNostrLinkrClient,
  NostrLinkrError,
  NostrLinkrErrorCode,
  getDeployment,
  getSupportedChainIds,
  DEPLOYMENTS,
  nostrLinkrAbi,
} from "../src/index.js";
import { createPublicClient, http } from "viem";
import { hardhat } from "viem/chains";

describe("createNostrLinkrClient", () => {
  it("creates client with known deployment", () => {
    const publicClient = createPublicClient({
      chain: hardhat,
      transport: http(),
    });

    const client = createNostrLinkrClient({
      chain: hardhat,
      publicClient,
    });

    expect(client.contractAddress).toBe(DEPLOYMENTS[31337].address);
    expect(client.chain.id).toBe(31337);
  });

  it("accepts custom contract address", () => {
    const publicClient = createPublicClient({
      chain: hardhat,
      transport: http(),
    });

    const customAddr = "0x1234567890123456789012345678901234567890" as const;
    const client = createNostrLinkrClient({
      chain: hardhat,
      publicClient,
      contractAddress: customAddr,
    });

    expect(client.contractAddress).toBe(customAddr);
  });

  it("throws for unknown chain without contractAddress", () => {
    const unknownChain = { ...hardhat, id: 999999, name: "Unknown" };
    const publicClient = createPublicClient({
      chain: unknownChain,
      transport: http(),
    });

    expect(() =>
      createNostrLinkrClient({
        chain: unknownChain,
        publicClient,
      }),
    ).toThrow(NostrLinkrError);
  });

  it("exposes all read methods", () => {
    const publicClient = createPublicClient({
      chain: hardhat,
      transport: http(),
    });
    const client = createNostrLinkrClient({ chain: hardhat, publicClient });

    expect(typeof client.getNostrPubkey).toBe("function");
    expect(typeof client.getEthereumAddress).toBe("function");
    expect(typeof client.isLinked).toBe("function");
    expect(typeof client.isLinkedByPubkey).toBe("function");
    expect(typeof client.getLink).toBe("function");
    expect(typeof client.getLinkByPubkey).toBe("function");
    expect(typeof client.batchGetEthereumAddresses).toBe("function");
    expect(typeof client.batchGetNostrPubkeys).toBe("function");
    expect(typeof client.verifyNostrEventOnChain).toBe("function");
    expect(typeof client.getEventHashOnChain).toBe("function");
    expect(typeof client.isPaused).toBe("function");
    expect(typeof client.getOwner).toBe("function");
    expect(typeof client.getLinkEvents).toBe("function");
    expect(typeof client.watchLinkEvents).toBe("function");
  });

  it("exposes all write methods", () => {
    const publicClient = createPublicClient({
      chain: hardhat,
      transport: http(),
    });
    const client = createNostrLinkrClient({ chain: hardhat, publicClient });

    expect(typeof client.pushLink).toBe("function");
    expect(typeof client.pullLink).toBe("function");
    expect(typeof client.simulatePushLink).toBe("function");
    expect(typeof client.simulatePullLink).toBe("function");
  });
});

describe("constants", () => {
  it("getDeployment returns hardhat deployment", () => {
    const deployment = getDeployment(31337);
    expect(deployment).toBeDefined();
    expect(deployment!.chainName).toBe("Hardhat");
  });

  it("getDeployment returns undefined for unknown chain", () => {
    expect(getDeployment(999999)).toBeUndefined();
  });

  it("getSupportedChainIds returns array of numbers", () => {
    const ids = getSupportedChainIds();
    expect(ids).toContain(31337);
    expect(ids.length).toBeGreaterThan(0);
  });
});

describe("ABI", () => {
  it("exports the contract ABI", () => {
    expect(Array.isArray(nostrLinkrAbi)).toBe(true);
    expect(nostrLinkrAbi.length).toBeGreaterThan(0);
  });

  it("contains pushLinkr function", () => {
    const pushLinkr = nostrLinkrAbi.find(
      (item) => item.type === "function" && "name" in item && item.name === "pushLinkr",
    );
    expect(pushLinkr).toBeDefined();
  });

  it("contains pullLinkr function", () => {
    const pullLinkr = nostrLinkrAbi.find(
      (item) => item.type === "function" && "name" in item && item.name === "pullLinkr",
    );
    expect(pullLinkr).toBeDefined();
  });

  it("contains LinkrPushed event", () => {
    const event = nostrLinkrAbi.find(
      (item) => item.type === "event" && "name" in item && item.name === "LinkrPushed",
    );
    expect(event).toBeDefined();
  });
});

describe("errors", () => {
  it("NostrLinkrError has correct code", () => {
    const error = new NostrLinkrError("test", NostrLinkrErrorCode.NO_DEPLOYMENT);
    expect(error.code).toBe(NostrLinkrErrorCode.NO_DEPLOYMENT);
    expect(error.message).toBe("test");
    expect(error.name).toBe("NostrLinkrError");
  });
});
