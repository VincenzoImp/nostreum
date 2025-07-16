"use client";

import { useEffect, useState } from "react";
import { getEventHash } from "nostr-tools";
import { hexToBytes, toHex } from "viem";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
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
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [hasLinkr, setHasLinkr] = useState(false);

  // Leggi il pubkey associato all'address
  const { data: linkedPubkey } = useScaffoldReadContract({
    contractName: "NostrLinkr",
    functionName: "addressPubkey",
    args: [address],
  });

  // Hook per pushLinkr
  const { writeContractAsync: pushLinkr } = useScaffoldWriteContract("NostrLinkr");

  // Hook per pullLinkr
  const { writeContractAsync: pullLinkr } = useScaffoldWriteContract("NostrLinkr");

  // Controlla se esiste già un linkr
  useEffect(() => {
    if (linkedPubkey && linkedPubkey !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
      setHasLinkr(true);
    } else {
      setHasLinkr(false);
    }
  }, [linkedPubkey]);

  const performLink = async () => {
    setLoading(true);
    setResponse(null);

    try {
      if (!window.nostr) {
        notification.error("Estensione Nostr non disponibile (es. Alby)");
        setLoading(false);
        return;
      }

      const pubkey = await window.nostr.getPublicKey();
      const createdAt = Math.floor(Date.now() / 1000);
      const kind = 27235;
      const tags: any[] = [];
      const content = address.toLowerCase();

      // Crea evento nostr secondo NIP-01
      const nostrEvent = {
        kind: kind,
        created_at: createdAt,
        tags: tags,
        content: content,
        pubkey: pubkey,
      };

      // Calcola ID evento (hash) - nostr-tools fa questo automaticamente
      const eventWithId = {
        ...nostrEvent,
        id: getEventHash(nostrEvent),
      };

      console.log("Event before signing:", eventWithId);

      // Firma evento con nostr
      const signedEvent = await window.nostr.signEvent(eventWithId);

      console.log("Signed event:", signedEvent);

      // Verifica che l'evento sia stato firmato correttamente
      if (!signedEvent.sig || signedEvent.sig.length !== 128) {
        throw new Error("Invalid signature from Nostr extension");
      }

      // Convert hex strings to proper format using viem utilities
      const eventIdBytes32 = toHex(hexToBytes(`0x${signedEvent.id}`), { size: 32 });
      const pubkeyBytes32 = toHex(hexToBytes(`0x${signedEvent.pubkey}`), { size: 32 });
      const signatureBytes = toHex(hexToBytes(`0x${signedEvent.sig}`));

      console.log("Contract args:", {
        id: eventIdBytes32,
        pubkey: pubkeyBytes32,
        createdAt: signedEvent.created_at,
        kind: signedEvent.kind,
        tags: JSON.stringify(signedEvent.tags),
        content: signedEvent.content as `0x${string}`,
        sig: signatureBytes,
      });

      // Scrivi su smart contract
      await pushLinkr({
        functionName: "pushLinkr",
        args: [
          eventIdBytes32,
          pubkeyBytes32,
          BigInt(signedEvent.created_at),
          BigInt(signedEvent.kind),
          JSON.stringify(signedEvent.tags),
          signedEvent.content as `0x${string}`,
          signatureBytes,
        ],
      });

      notification.success("Linkr creato con successo!");
      setResponse({
        message: "Evento firmato e salvato su smart contract.",
        eventId: signedEvent.id,
        pubkey: signedEvent.pubkey,
        signature: signedEvent.sig,
      });
    } catch (error) {
      console.error("Errore durante la creazione del linkr:", error);
      if (error instanceof Error) {
        notification.error(`Errore durante la creazione del linkr: ${error.message}`);
      } else {
        notification.error(`Errore durante la creazione del linkr: ${String(error)}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const performUnlink = async () => {
    setLoading(true);

    try {
      await pullLinkr({
        functionName: "pullLinkr",
      });
      notification.success("Linkr rimosso con successo!");
      setResponse(null);
    } catch (error) {
      console.error("Errore nella rimozione del linkr:", error);
      notification.error("Errore nella rimozione del linkr");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-6 border rounded-xl max-w-xl mx-auto bg-base-200 shadow-md">
      <h2 className="text-xl font-bold flex items-center gap-2">🔗 Link Ethereum + Nostr</h2>

      <div className="flex items-center gap-2">
        <span className="text-sm text-accent">Ethereum:</span>
        <Address address={address} size="sm" />
      </div>

      {hasLinkr && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-accent">Nostr Pubkey:</span>
          <span className="text-xs font-mono bg-base-300 px-2 py-1 rounded">
            {linkedPubkey?.slice(0, 8)}...{linkedPubkey?.slice(-8)}
          </span>
        </div>
      )}

      {!hasLinkr ? (
        <button
          className="btn btn-primary btn-sm px-4 rounded-full flex items-center gap-2"
          onClick={performLink}
          disabled={loading}
        >
          {loading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <span>🔗</span>}
          <span>{loading ? "Creazione..." : "Crea Linkr"}</span>
        </button>
      ) : (
        <button
          className="btn btn-error btn-sm px-4 rounded-full flex items-center gap-2"
          onClick={performUnlink}
          disabled={loading}
        >
          {loading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <span>🔓</span>}
          <span>{loading ? "Rimozione..." : "Rimuovi Linkr"}</span>
        </button>
      )}

      {response && (
        <div className="mt-4 p-3 bg-base-100 rounded-md text-sm break-all">
          <p className="mb-2">
            <strong>📜 Status:</strong> {response.message}
          </p>
          <p className="mb-2">
            <strong>🆔 Event ID:</strong>
            <span className="font-mono text-xs block mt-1">{response.eventId}</span>
          </p>
          <p className="mb-2">
            <strong>🔑 Pubkey:</strong>
            <span className="font-mono text-xs block mt-1">{response.pubkey}</span>
          </p>
          <p>
            <strong>✍️ Signature:</strong>
            <span className="font-mono text-xs block mt-1">{response.signature}</span>
          </p>
        </div>
      )}
    </div>
  );
};
