"use client";

import { useCallback, useEffect, useState } from "react";
import { useNostr } from "~~/contexts/NostrContext";
import { notification } from "~~/utils/scaffold-eth/notification";

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ComposeModal({ isOpen, onClose }: ComposeModalProps) {
  const { publish } = useNostr();
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handlePost = useCallback(async () => {
    if (!content.trim() || posting) return;

    if (!window.nostr) {
      notification.error("Please install a Nostr extension (Alby, nos2x)");
      return;
    }

    setPosting(true);
    try {
      const event = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: content.trim(),
      };
      const signed = await window.nostr.signEvent(event);
      const ok = await publish(signed);
      if (ok) {
        notification.success("Posted successfully");
        setContent("");
        onClose();
      } else {
        notification.error("Failed to publish");
      }
    } catch {
      notification.error("Failed to sign event");
    } finally {
      setPosting(false);
    }
  }, [content, posting, publish, onClose]);

  if (!isOpen) return null;

  const charPercent = Math.min((content.length / 280) * 100, 100);
  const isOverLimit = content.length > 280;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 animate-fade-in">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg glass-card p-5 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onClose}
            className="text-sm font-medium text-base-content/50 hover:text-base-content transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePost}
            disabled={!content.trim() || posting || isOverLimit}
            className="btn btn-primary btn-sm rounded-full px-6 disabled:opacity-40"
          >
            {posting ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-primary-content border-t-transparent rounded-full animate-spin" />
                Posting
              </span>
            ) : (
              "Post"
            )}
          </button>
        </div>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full h-36 bg-transparent text-base-content text-sm resize-none outline-none placeholder:text-base-content/25 leading-relaxed"
          autoFocus
        />
        <div className="flex items-center justify-between pt-3 border-t border-base-300/30">
          <div className="w-8 h-8 relative">
            <svg className="w-8 h-8 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-base-300/30"
              />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={`${charPercent * 0.9425} 94.25`}
                className={isOverLimit ? "text-error" : charPercent > 80 ? "text-warning" : "text-primary"}
              />
            </svg>
          </div>
          <span className={`text-xs font-mono ${isOverLimit ? "text-error" : "text-base-content/30"}`}>
            {content.length > 0 && `${content.length}/280`}
          </span>
        </div>
      </div>
    </div>
  );
}
