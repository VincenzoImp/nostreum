"use client";

import { RelayConnection } from "~~/types/nostreum";

interface RelayStatusProps {
  relay: RelayConnection;
  reconnectAttempts?: number;
  maxReconnectAttempts?: number;
}

export const RelayStatus = ({ relay, maxReconnectAttempts = 5 }: RelayStatusProps) => {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${
          relay.connected ? "bg-success" : relay.connecting ? "bg-warning animate-pulse" : "bg-error"
        }`}
      />
      <span className="text-xs text-base-content/60">
        {relay.connected ? relay.url.replace("wss://", "") : relay.connecting ? "Connecting..." : "Disconnected"}
      </span>
      {relay.reconnectAttempts > 0 && (
        <span className="text-[10px] text-warning">
          ({relay.reconnectAttempts}/{maxReconnectAttempts})
        </span>
      )}
    </div>
  );
};
