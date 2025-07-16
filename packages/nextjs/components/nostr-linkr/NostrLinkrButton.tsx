"use client";

import { useEffect, useState } from "react";
import { getEventHash } from "nostr-tools";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth/notification";

/**
 * Global window interface extensions for Nostr and Ethereum browser extensions
 */
declare global {
  interface Window {
    // Nostr browser extension (e.g., Alby, nos2x)
    nostr?: {
      getPublicKey: () => Promise<string>;
      signEvent: (event: any) => Promise<any>;
    };
    // Ethereum browser extension (e.g., MetaMask)
    ethereum?: any;
  }
}

/**
 * NostrLinkrButton Component
 *
 * This component provides a UI for linking/unlinking Ethereum addresses with Nostr public keys.
 * It interacts with both Nostr browser extensions and the NostrLinkr smart contract.
 *
 * @param address - The Ethereum address to link with a Nostr public key
 */
export const NostrLinkrButton = ({ address }: { address: string }) => {
  // Loading state for async operations
  const [loading, setLoading] = useState(false);

  // Response data from successful operations
  const [response, setResponse] = useState<any>(null);

  // Boolean flag to track if current address has an existing link
  const [hasLinkr, setHasLinkr] = useState(false);

  /**
   * Read the Nostr public key associated with the current Ethereum address
   * This hook automatically re-fetches when the address changes
   */
  const { data: linkedPubkey } = useScaffoldReadContract({
    contractName: "NostrLinkr",
    functionName: "addressPubkey",
    args: [address],
  });

  /**
   * Hook for calling the pushLinkr function on the smart contract
   * This creates a new link between Ethereum address and Nostr pubkey
   */
  const { writeContractAsync: pushLinkr } = useScaffoldWriteContract("NostrLinkr");

  /**
   * Hook for calling the pullLinkr function on the smart contract
   * This removes an existing link
   */
  const { writeContractAsync: pullLinkr } = useScaffoldWriteContract("NostrLinkr");

  /**
   * Effect to check if there's an existing link
   * Updates the hasLinkr state based on the linkedPubkey value
   */
  useEffect(() => {
    // Check if linkedPubkey exists and is not the zero bytes32 value
    if (linkedPubkey && linkedPubkey !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
      setHasLinkr(true);
    } else {
      setHasLinkr(false);
    }
  }, [linkedPubkey]);

  /**
   * Main function to create a link between Ethereum address and Nostr pubkey
   * This function:
   * 1. Gets the user's Nostr public key from browser extension
   * 2. Creates a Nostr event with the Ethereum address as content
   * 3. Signs the event using the Nostr extension
   * 4. Submits the signed event to the smart contract
   */
  const performLink = async () => {
    setLoading(true);
    setResponse(null);

    try {
      // Check if Nostr browser extension is available
      if (!window.nostr) {
        notification.error("Nostr extension not available (e.g., Alby)");
        setLoading(false);
        return;
      }

      // Get the user's Nostr public key from the browser extension
      const pubkey = await window.nostr.getPublicKey();

      // Create timestamp for the event (Unix timestamp in seconds)
      const createdAt = Math.floor(Date.now() / 1000);

      // Event kind 27235 is designated for Nostr-Ethereum linkage
      const kind = 27235;

      // Empty tags array as required by the contract
      const tags: any[] = [];

      // Format the address: lowercase without 0x prefix (as required by contract)
      const content = address.toLowerCase().replace("0x", "");

      /**
       * Create Nostr event according to NIP-01 specification
       * This event will prove ownership of both the Nostr key and Ethereum address
       */
      const nostrEvent = {
        kind: kind,
        created_at: createdAt,
        tags: tags,
        content: content,
        pubkey: pubkey,
      };

      /**
       * Calculate event ID (hash) using nostr-tools
       * The event ID is a SHA-256 hash of the serialized event
       */
      const eventWithId = {
        ...nostrEvent,
        id: getEventHash(nostrEvent),
      };

      console.log("Event before signing:", eventWithId);

      /**
       * Sign the event using the Nostr browser extension
       * This proves ownership of the Nostr private key
       */
      const signedEvent = await window.nostr.signEvent(eventWithId);

      console.log("Signed event:", signedEvent);

      /**
       * Validate the signature format
       * Nostr signatures should be 128 hex characters (64 bytes)
       */
      if (!signedEvent.sig || signedEvent.sig.length !== 128) {
        throw new Error("Invalid signature from Nostr extension");
      }

      /**
       * Convert hex strings to proper bytes32 format for the smart contract
       * Solidity expects bytes32 parameters with 0x prefix
       */
      const idBytes32 = `0x${signedEvent.id}` as `0x${string}`;
      const pubkeyBytes32 = `0x${signedEvent.pubkey}` as `0x${string}`;
      const sigBytes = `0x${signedEvent.sig}` as `0x${string}`;

      // Debug logging for contract interaction
      console.log("Contract args:", {
        id: idBytes32,
        pubkey: pubkeyBytes32,
        createdAt: signedEvent.created_at,
        kind: signedEvent.kind,
        tags: JSON.stringify(signedEvent.tags),
        content: signedEvent.content,
        sig: sigBytes,
      });

      // Additional debug logging for content validation
      console.log("Address for content:", address);
      console.log("Content being sent:", signedEvent.content);
      console.log("Expected content format:", address.toLowerCase());

      /**
       * Submit the signed event to the smart contract
       * The contract will verify the signature and create the link
       */
      await pushLinkr({
        functionName: "pushLinkr",
        args: [
          idBytes32, // Event ID
          pubkeyBytes32, // Nostr public key
          BigInt(signedEvent.created_at), // Timestamp as BigInt
          BigInt(signedEvent.kind), // Event kind as BigInt
          JSON.stringify(signedEvent.tags), // Tags as JSON string
          signedEvent.content, // Address content
          sigBytes, // Signature
        ],
      });

      // Show success notification
      notification.success("Link created successfully!");

      // Store response data for display
      setResponse({
        message: "Event signed and saved to smart contract.",
        eventId: signedEvent.id,
        pubkey: signedEvent.pubkey,
        signature: signedEvent.sig,
      });
    } catch (error) {
      // Handle and display errors
      console.error("Error creating link:", error);
      if (error instanceof Error) {
        notification.error(`Error creating link: ${error.message}`);
      } else {
        notification.error(`Error creating link: ${String(error)}`);
      }
    } finally {
      // Always reset loading state
      setLoading(false);
    }
  };

  /**
   * Function to remove an existing link
   * Calls the pullLinkr function on the smart contract
   */
  const performUnlink = async () => {
    setLoading(true);

    try {
      // Call the smart contract to remove the link
      await pullLinkr({
        functionName: "pullLinkr",
      });

      // Show success notification
      notification.success("Link removed successfully!");

      // Clear response data
      setResponse(null);
    } catch (error) {
      // Handle and display errors
      console.error("Error removing link:", error);
      notification.error("Error removing link");
    } finally {
      // Always reset loading state
      setLoading(false);
    }
  };

  /**
   * Render the component UI
   */
  return (
    <div className="space-y-4 p-6 border rounded-xl max-w-xl mx-auto bg-base-200 shadow-md">
      {/* Component title */}
      <h2 className="text-xl font-bold flex items-center gap-2">🔗 Link Ethereum + Nostr</h2>

      {/* Display current Ethereum address */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-accent">Ethereum:</span>
        <Address address={address} size="sm" />
      </div>

      {/* Display linked Nostr pubkey if it exists */}
      {hasLinkr && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-accent">Nostr Pubkey:</span>
          <span className="text-xs font-mono bg-base-300 px-2 py-1 rounded">
            {/* Show truncated pubkey for better UX */}
            {linkedPubkey?.slice(0, 8)}...{linkedPubkey?.slice(-8)}
          </span>
        </div>
      )}

      {/* Conditional button rendering based on link status */}
      {!hasLinkr ? (
        // Show "Create Link" button if no link exists
        <button
          className="btn btn-primary btn-sm px-4 rounded-full flex items-center gap-2"
          onClick={performLink}
          disabled={loading}
        >
          {/* Dynamic icon based on loading state */}
          {loading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <span>🔗</span>}
          {/* Dynamic text based on loading state */}
          <span>{loading ? "Creating..." : "Create Link"}</span>
        </button>
      ) : (
        // Show "Remove Link" button if link exists
        <button
          className="btn btn-error btn-sm px-4 rounded-full flex items-center gap-2"
          onClick={performUnlink}
          disabled={loading}
        >
          {/* Dynamic icon based on loading state */}
          {loading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <span>🔓</span>}
          {/* Dynamic text based on loading state */}
          <span>{loading ? "Removing..." : "Remove Link"}</span>
        </button>
      )}

      {/* Display response information after successful link creation */}
      {response && (
        <div className="mt-4 p-3 bg-base-100 rounded-md text-sm break-all">
          {/* Success message */}
          <p className="mb-2">
            <strong>📜 Status:</strong> {response.message}
          </p>

          {/* Event ID display */}
          <p className="mb-2">
            <strong>🆔 Event ID:</strong>
            <span className="font-mono text-xs block mt-1">{response.eventId}</span>
          </p>

          {/* Public key display */}
          <p className="mb-2">
            <strong>🔑 Pubkey:</strong>
            <span className="font-mono text-xs block mt-1">{response.pubkey}</span>
          </p>

          {/* Signature display */}
          <p>
            <strong>✍️ Signature:</strong>
            <span className="font-mono text-xs block mt-1">{response.signature}</span>
          </p>
        </div>
      )}
    </div>
  );
};
