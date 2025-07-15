"use client";

import { useState } from "react";
import { getEventHash } from "nostr-tools";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

declare global {
  interface Window {
    nostr?: {
      getPublicKey: () => Promise<string>;
      signEvent: (event: any) => Promise<any>;
    };
    ethereum?: any;
  }
}

export const NostrLinkrButton = ({ address }: { address: string }) => {
  const [loading, setLoading] = useState(false);

  const { writeContractAsync: linkNostr } = useScaffoldWriteContract({
    contractName: "NostrLinkr",
  });

  const handleClick = async () => {
    if (!window.nostr) {
      alert("Nostr extension not found (e.g., Alby)");
      return;
    }

    if (!window.ethereum) {
      alert("Ethereum provider not found (e.g., MetaMask)");
      return;
    }

    try {
      setLoading(true);

      const pubKey = await window.nostr.getPublicKey();
      const message = `Link Ethereum ${address} with Nostr ${pubKey}`;

      const ethSig = await window.ethereum.request({
        method: "personal_sign",
        params: [message, address],
      });

      // Optional: Nostr event signing
      const nostrEvent: {
        kind: number;
        created_at: number;
        tags: any[];
        content: string;
        pubkey: string;
        id?: string;
      } = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: message,
        pubkey: pubKey,
      };
      nostrEvent.id = getEventHash(nostrEvent);
      await window.nostr.signEvent(nostrEvent); // Not used by contract, but signed for proof if needed

      // Call the smart contract
      await linkNostr({
        functionName: "linkNostr",
        args: [pubKey, ethSig],
      });

      alert("Successfully linked your Ethereum and Nostr identities!");
    } catch (error) {
      console.error("Linking error:", error);
      alert("An error occurred during linking. Check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? "Linking..." : "🔗 Link Ethereum + Nostr"}
    </button>
  );
};
