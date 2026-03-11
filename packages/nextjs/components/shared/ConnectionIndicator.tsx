"use client";

import { useNostr } from "~~/contexts/NostrContext";

export function ConnectionIndicator() {
  const { status, activeRelay, reconnectAttempts } = useNostr();

  const dotColor = {
    connected: "bg-success",
    connecting: "bg-warning animate-pulse",
    disconnected: "bg-base-content/30",
    error: "bg-error",
  }[status];

  const label = activeRelay.replace("wss://", "").replace("relay.", "");

  return (
    <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-base-300/30 text-xs text-base-content/50">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      <span className="truncate max-w-24">{label}</span>
      {status === "connecting" && reconnectAttempts > 0 && <span className="text-warning">#{reconnectAttempts}</span>}
    </div>
  );
}
