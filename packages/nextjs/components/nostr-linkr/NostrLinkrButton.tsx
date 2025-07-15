"use client";

import { useState } from "react";
import { getEventHash } from "nostr-tools";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
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

  const nostr_linkr_verifier_url = "https://nostr-linkr-verifier.vercel.app";
  // const nostr_linkr_verifier_url = "http://localhost:5000";

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
      }
    } catch (err) {
      console.error(err);
      notification.error("Errore nel collegamento");
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

      <button
        className="btn btn-primary btn-sm px-4 rounded-full flex items-center gap-2"
        onClick={performLink}
        disabled={loading}
      >
        {loading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <span>🔗</span>}
        <span>{loading ? "Verifica..." : "Link via Server"}</span>
      </button>

      {response && (
        <div className="mt-4 p-3 bg-base-100 rounded-md text-sm break-all">
          <p>
            <strong>📜 Message:</strong>
          </p>
          <pre className="whitespace-pre-wrap">{JSON.stringify(JSON.parse(response.message), null, 2)}</pre>
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
