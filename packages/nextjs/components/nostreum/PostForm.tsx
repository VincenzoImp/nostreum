"use client";

import { useState } from "react";
import { getEventHash } from "nostr-tools";
import { ArrowPathIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { RelayConnection } from "~~/types/nostreum";
import { notification } from "~~/utils/scaffold-eth/notification";

interface PostFormProps {
  relay: RelayConnection;
  onPostSuccess?: (event: any) => void;
  isLoading?: boolean;
  onLoadingChange?: (loading: boolean) => void;
}

/**
 * PostForm Component
 *
 * Reusable component for posting notes to Nostr
 */
export const PostForm = ({ relay, onPostSuccess, isLoading = false, onLoadingChange }: PostFormProps) => {
  const [newNote, setNewNote] = useState("");
  const [showForm, setShowForm] = useState(false);

  /**
   * Post a new note to the Nostr network
   */
  const postNote = async () => {
    if (!newNote.trim() || !window.nostr) {
      notification.error("Please enter a note and ensure Nostr extension is available");
      return;
    }

    if (!relay.connected || !relay.ws) {
      notification.error("Not connected to relay. Please connect first.");
      return;
    }

    try {
      onLoadingChange?.(true);

      const pubkey = await window.nostr.getPublicKey();

      const noteEvent = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: newNote.trim(),
        pubkey: pubkey,
      };

      const eventWithId = {
        ...noteEvent,
        id: getEventHash(noteEvent),
      };

      const signedEvent = await window.nostr.signEvent(eventWithId);

      const publishMessage = JSON.stringify(["EVENT", signedEvent]);
      relay.ws.send(publishMessage);

      notification.success("Note published successfully!");
      setNewNote("");
      setShowForm(false);

      // Call success callback if provided
      onPostSuccess?.(signedEvent);
    } catch (error) {
      console.error("Error posting note:", error);
      notification.error("Failed to post note");
    } finally {
      onLoadingChange?.(false);
    }
  };

  if (!showForm) {
    return (
      <button className="btn btn-sm btn-secondary" onClick={() => setShowForm(true)} disabled={!relay.connected}>
        <PlusIcon className="w-4 h-4" />
        Post
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Write a new note</h4>
        <button className="btn btn-ghost btn-xs" onClick={() => setShowForm(false)}>
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      <textarea
        className="textarea textarea-bordered w-full"
        placeholder="What's on your mind?"
        value={newNote}
        onChange={e => setNewNote(e.target.value)}
        rows={3}
        disabled={isLoading}
      />

      <div className="flex justify-end gap-2">
        <button className="btn btn-sm btn-ghost" onClick={() => setShowForm(false)} disabled={isLoading}>
          Cancel
        </button>
        <button
          className="btn btn-sm btn-primary"
          onClick={postNote}
          disabled={isLoading || !newNote.trim() || !relay.connected}
        >
          {isLoading ? (
            <>
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
              Posting...
            </>
          ) : (
            "Post Note"
          )}
        </button>
      </div>
    </div>
  );
};
