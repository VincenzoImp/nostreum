/** Nostr event kind used for NostrLinkr identity linking. */
export const NOSTR_LINKR_EVENT_KIND = 27235;

/** Standard Nostr event kinds referenced by the SDK. */
export const NOSTR_EVENT_KINDS = {
  METADATA: 0,
  TEXT_NOTE: 1,
  REACTION: 7,
  LINKR: 27235,
} as const;

/** Maximum future timestamp tolerance in seconds (5 minutes). */
export const MAX_FUTURE_TOLERANCE = 300;

/** Maximum past timestamp tolerance in seconds (1 hour). */
export const MAX_PAST_TOLERANCE = 3600;
