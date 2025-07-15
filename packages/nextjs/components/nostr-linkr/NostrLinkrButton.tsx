"use client";

import { useEffect, useState } from "react";
import { getEventHash } from "nostr-tools";
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

  const nostr_linkr_verifier_url = "https://nostr-linkr-verifier.vercel.app";
  // const nostr_linkr_verifier_url = "http://localhost:5000";

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
      const content = address.toLowerCase(); // Ethereum address nel campo content

      // Crea evento nostr
      const nostrEvent: any = {
        kind: 27235,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: content,
        pubkey: pubkey,
        sig: "",
      };

      // Calcola ID evento (hash)
      nostrEvent.id = getEventHash(nostrEvent);

      // Firma evento con nostr
      const signedEvent = await window.nostr.signEvent(nostrEvent);

      // Invio al backend
      const res = await fetch(`${nostr_linkr_verifier_url}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signedEvent),
      });

      const resJson = await res.json();

      if (!res.ok) {
        notification.error(resJson.error || "Errore nella verifica");
      } else {
        setResponse(resJson);
        notification.success("Verifica completata!");

        try {
          await pushLinkr({
            functionName: "pushLinkr",
            args: [resJson.message, resJson.signature.slice(0, 32), resJson.signature.slice(32, 64), resJson.signer],
          });
          notification.success("Linkr creato con successo!");
        } catch (error) {
          console.error("Errore nella creazione del linkr:", error);
          notification.error("Errore nella creazione del linkr");
        }
      }
    } catch (err) {
      console.error(err);
      notification.error("Errore nel collegamento");
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
          <p>
            <strong>📜 Message:</strong>
          </p>
          <pre className="whitespace-pre-wrap">{response.message}</pre>
          <p>
            <strong>✍️ Sign:</strong> {response.signature}
          </p>
          <p>
            <strong>🧾 Signer:</strong> {response.signer}
          </p>
        </div>
      )}
    </div>
  );
};
