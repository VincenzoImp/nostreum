export function truncatePubkey(pubkey: string, chars = 8): string {
  if (pubkey.length <= chars * 2) return pubkey;
  return `${pubkey.slice(0, chars)}...${pubkey.slice(-chars)}`;
}

export function truncateAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatTimestamp(unixSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - unixSeconds;

  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;

  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function isHexPubkey(value: string): boolean {
  return /^[0-9a-fA-F]{64}$/.test(value);
}

export function isEthAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

export function isNpub(value: string): boolean {
  return value.startsWith("npub1") && value.length === 63;
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function isZeroAddress(address: string | undefined): boolean {
  return !address || address === ZERO_ADDRESS;
}

const ZERO_PUBKEY = "0x0000000000000000000000000000000000000000000000000000000000000000";

export function isZeroPubkey(pubkey: string | undefined): boolean {
  return !pubkey || pubkey === ZERO_PUBKEY;
}
