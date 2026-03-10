import { describe, it, expect } from "vitest";
import {
  createLinkEvent,
  serializeEvent,
  hashEvent,
  hashAndPrepare,
  validateLinkEvent,
  NOSTR_LINKR_EVENT_KIND,
} from "../src/index.js";

const TEST_PUBKEY = "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";
const TEST_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const TEST_CONTENT = "f39fd6e51aad88f6f4ce6ab8827279cfffb92266";

describe("createLinkEvent", () => {
  it("creates an unsigned event with correct fields", () => {
    const event = createLinkEvent(TEST_ADDRESS, TEST_PUBKEY, 1700000000);

    expect(event.pubkey).toBe(TEST_PUBKEY);
    expect(event.created_at).toBe(1700000000);
    expect(event.kind).toBe(NOSTR_LINKR_EVENT_KIND);
    expect(event.tags).toEqual([]);
    expect(event.content).toBe(TEST_CONTENT);
  });

  it("strips 0x prefix and lowercases address", () => {
    const event = createLinkEvent("0xABCDEF1234567890abcdef1234567890ABCDEF12", TEST_PUBKEY);
    expect(event.content).toBe("abcdef1234567890abcdef1234567890abcdef12");
  });

  it("uses current timestamp if none provided", () => {
    const before = Math.floor(Date.now() / 1000);
    const event = createLinkEvent(TEST_ADDRESS, TEST_PUBKEY);
    const after = Math.floor(Date.now() / 1000);

    expect(event.created_at).toBeGreaterThanOrEqual(before);
    expect(event.created_at).toBeLessThanOrEqual(after);
  });
});

describe("serializeEvent", () => {
  it("produces NIP-01 canonical JSON", () => {
    const event = createLinkEvent(TEST_ADDRESS, TEST_PUBKEY, 1700000000);
    const serialized = serializeEvent(event);

    expect(serialized).toBe(
      `[0,"${TEST_PUBKEY}",1700000000,${NOSTR_LINKR_EVENT_KIND},[],"${TEST_CONTENT}"]`,
    );
  });

  it("matches the format [0,pubkey,created_at,kind,tags,content]", () => {
    const event = createLinkEvent(TEST_ADDRESS, TEST_PUBKEY, 1700000000);
    const parsed = JSON.parse(serializeEvent(event));

    expect(parsed[0]).toBe(0);
    expect(parsed[1]).toBe(TEST_PUBKEY);
    expect(parsed[2]).toBe(1700000000);
    expect(parsed[3]).toBe(NOSTR_LINKR_EVENT_KIND);
    expect(parsed[4]).toEqual([]);
    expect(parsed[5]).toBe(TEST_CONTENT);
  });
});

describe("hashEvent", () => {
  it("returns a 64-char hex string without 0x prefix", () => {
    const event = createLinkEvent(TEST_ADDRESS, TEST_PUBKEY, 1700000000);
    const hash = hashEvent(event);

    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same input", () => {
    const event = createLinkEvent(TEST_ADDRESS, TEST_PUBKEY, 1700000000);
    const hash1 = hashEvent(event);
    const hash2 = hashEvent(event);

    expect(hash1).toBe(hash2);
  });

  it("changes when event content changes", () => {
    const event1 = createLinkEvent(TEST_ADDRESS, TEST_PUBKEY, 1700000000);
    const event2 = createLinkEvent("0x0000000000000000000000000000000000000001", TEST_PUBKEY, 1700000000);

    expect(hashEvent(event1)).not.toBe(hashEvent(event2));
  });
});

describe("hashAndPrepare", () => {
  it("adds the id field matching hashEvent", () => {
    const event = createLinkEvent(TEST_ADDRESS, TEST_PUBKEY, 1700000000);
    const prepared = hashAndPrepare(event);

    expect(prepared.id).toBe(hashEvent(event));
    expect(prepared.pubkey).toBe(event.pubkey);
    expect(prepared.created_at).toBe(event.created_at);
  });
});

describe("validateLinkEvent", () => {
  function makeValidSignedEvent(): ReturnType<typeof hashAndPrepare> & { sig: string } {
    const event = createLinkEvent(TEST_ADDRESS, TEST_PUBKEY);
    const prepared = hashAndPrepare(event);
    return {
      ...prepared,
      sig: "a".repeat(128), // valid length placeholder
    };
  }

  it("passes for a well-formed event", () => {
    const event = makeValidSignedEvent();
    const { valid, errors } = validateLinkEvent(event);

    expect(valid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it("fails for wrong event kind", () => {
    const event = { ...makeValidSignedEvent(), kind: 1 };
    // Recompute hash since kind changed
    const rehashed = hashAndPrepare(event);
    const { valid, errors } = validateLinkEvent({ ...rehashed, sig: "a".repeat(128) });

    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes("kind"))).toBe(true);
  });

  it("fails for non-empty tags", () => {
    const event = makeValidSignedEvent();
    event.tags = [["p", "some-pubkey"]];
    const { valid, errors } = validateLinkEvent(event);

    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes("Tags"))).toBe(true);
  });

  it("fails for invalid content (not 40 hex chars)", () => {
    const event = makeValidSignedEvent();
    event.content = "not-an-address";
    const { valid, errors } = validateLinkEvent(event);

    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes("Content") || e.includes("address"))).toBe(true);
  });

  it("fails for invalid signature length", () => {
    const event = makeValidSignedEvent();
    event.sig = "abc";
    const { valid, errors } = validateLinkEvent(event);

    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes("Signature"))).toBe(true);
  });

  it("detects content mismatch with signer address", () => {
    const event = makeValidSignedEvent();
    const { valid, errors } = validateLinkEvent(event, "0x0000000000000000000000000000000000000001");

    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes("signer address"))).toBe(true);
  });

  it("matches content with signer address (case-insensitive)", () => {
    const event = makeValidSignedEvent();
    const { valid } = validateLinkEvent(event, TEST_ADDRESS);

    expect(valid).toBe(true);
  });

  it("detects event id mismatch", () => {
    const event = makeValidSignedEvent();
    event.id = "b".repeat(64);
    const { valid, errors } = validateLinkEvent(event);

    expect(valid).toBe(false);
    expect(errors.some((e) => e.includes("ID mismatch"))).toBe(true);
  });
});
