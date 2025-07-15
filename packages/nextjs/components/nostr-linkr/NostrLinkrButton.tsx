"use client";

import { useState } from "react";
import { getEventHash } from "nostr-tools";
import { ArrowPathIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth/notification";

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
  const [_nostrPubKey, setNostrPubKey] = useState("");
  const [_nostrSig, setNostrSig] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { writeContractAsync: linkNostr } = useScaffoldWriteContract({
    contractName: "NostrLinkr",
  });

  const performLink = async () => {
    setSuccess(false);
    setLoading(true);
    try {
      if (!window.nostr) {
        notification.error(
          <span>
            Estensione Nostr non disponibile (es.{" "}
            <a href="https://getalby.com/" target="_blank" rel="noopener noreferrer" className="underline">
              Alby
            </a>
            )
          </span>,
        );
        setLoading(false);
        return;
      }
      if (!window.ethereum) {
        notification.error("Ethereum provider non trovato (es. MetaMask)");
        setLoading(false);
        return;
      }

      const pubKey = await window.nostr.getPublicKey();
      setNostrPubKey(pubKey);

      // 🔐 Firma dell'address Ethereum da parte di Nostr
      const ethAddressToSign = address.toLowerCase(); // Consistenza

      const nostrEvent: any = {
        kind: 27235, // Custom kind
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: ethAddressToSign,
        pubkey: pubKey,
      };

      nostrEvent.id = getEventHash(nostrEvent);
      const signedEvent = await window.nostr.signEvent(nostrEvent);

      setNostrSig(signedEvent.sig);

      // ✅ Chiamata al contratto: linkNostr(pubkey, signature)
      await linkNostr({
        functionName: "linkNostr",
        args: [pubKey, signedEvent.sig],
      });

      setSuccess(true);
      notification.success("Collegamento Ethereum/Nostr completato!");
    } catch (err) {
      console.error("Errore nel collegamento:", err);
      notification.error("Errore nel collegamento, controlla la console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-6 border rounded-xl max-w-xl mx-auto bg-base-200 shadow-md">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <span>🔗</span> Link Ethereum + Nostr
      </h2>
      <div className="flex items-center gap-2">
        <span className="text-sm text-accent">Account Ethereum:</span>
        <Address address={address} size="sm" />
      </div>
      <button
        className="btn btn-primary btn-sm px-4 rounded-full flex items-center gap-2"
        onClick={performLink}
        disabled={loading}
      >
        {loading ? (
          <ArrowPathIcon className="h-4 w-4 animate-spin" />
        ) : success ? (
          <CheckCircleIcon className="h-4 w-4 text-success" />
        ) : (
          <span>🔗</span>
        )}
        <span>{loading ? "Collegamento in corso..." : success ? "Collegato!" : "Link via Smart Contract"}</span>
      </button>
    </div>
  );
};
