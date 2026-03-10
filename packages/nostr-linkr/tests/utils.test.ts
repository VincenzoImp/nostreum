import { describe, it, expect } from "vitest";
import {
  pubkeyToBytes32,
  bytes32ToPubkey,
  sigToHex,
  isValidPubkey,
  isValidSchnorrSig,
  addressToContent,
  isValidAddressContent,
  isZeroAddress,
  isTimestampValid,
} from "../src/index.js";

describe("pubkeyToBytes32", () => {
  it("adds 0x prefix", () => {
    const pk = "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";
    expect(pubkeyToBytes32(pk)).toBe(`0x${pk}`);
  });

  it("does not double-prefix", () => {
    const pk = "0x3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";
    expect(pubkeyToBytes32(pk)).toBe(pk);
  });
});

describe("bytes32ToPubkey", () => {
  it("strips 0x prefix", () => {
    const bytes32 = "0x3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";
    expect(bytes32ToPubkey(bytes32 as `0x${string}`)).toBe(
      "3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d",
    );
  });

  it("returns null for zero bytes32", () => {
    const zero = "0x0000000000000000000000000000000000000000000000000000000000000000";
    expect(bytes32ToPubkey(zero as `0x${string}`)).toBeNull();
  });
});

describe("sigToHex", () => {
  it("adds 0x prefix to raw sig", () => {
    const sig = "a".repeat(128);
    expect(sigToHex(sig)).toBe(`0x${sig}`);
  });

  it("preserves existing 0x prefix", () => {
    const sig = `0x${"a".repeat(128)}`;
    expect(sigToHex(sig)).toBe(sig);
  });
});

describe("isValidPubkey", () => {
  it("accepts valid 64-char hex", () => {
    expect(isValidPubkey("3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d")).toBe(true);
  });

  it("rejects uppercase", () => {
    expect(isValidPubkey("3BF0C63FCB93463407AF97A5E5EE64FA883D107EF9E558472C4EB9AAAEFA459D")).toBe(false);
  });

  it("rejects wrong length", () => {
    expect(isValidPubkey("abcdef")).toBe(false);
  });

  it("rejects 0x prefix", () => {
    expect(isValidPubkey("0x3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d")).toBe(false);
  });
});

describe("isValidSchnorrSig", () => {
  it("accepts valid 128-char hex", () => {
    expect(isValidSchnorrSig("a".repeat(128))).toBe(true);
  });

  it("rejects wrong length", () => {
    expect(isValidSchnorrSig("a".repeat(64))).toBe(false);
  });
});

describe("addressToContent", () => {
  it("lowercases and strips 0x", () => {
    expect(addressToContent("0xABCDEF1234567890abcdef1234567890ABCDEF12")).toBe(
      "abcdef1234567890abcdef1234567890abcdef12",
    );
  });
});

describe("isValidAddressContent", () => {
  it("accepts 40 lowercase hex chars", () => {
    expect(isValidAddressContent("f39fd6e51aad88f6f4ce6ab8827279cfffb92266")).toBe(true);
  });

  it("rejects uppercase", () => {
    expect(isValidAddressContent("F39FD6E51AAD88F6F4CE6AB8827279CFFFB92266")).toBe(false);
  });

  it("rejects 0x prefix", () => {
    expect(isValidAddressContent("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266")).toBe(false);
  });
});

describe("isZeroAddress", () => {
  it("detects zero address", () => {
    expect(isZeroAddress("0x0000000000000000000000000000000000000000")).toBe(true);
  });

  it("rejects non-zero", () => {
    expect(isZeroAddress("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")).toBe(false);
  });
});

describe("isTimestampValid", () => {
  const now = 1700000000;

  it("valid for current time", () => {
    const { valid } = isTimestampValid(now, now);
    expect(valid).toBe(true);
  });

  it("valid within future tolerance", () => {
    const { valid } = isTimestampValid(now + 200, now);
    expect(valid).toBe(true);
  });

  it("invalid too far in future", () => {
    const result = isTimestampValid(now + 400, now);
    expect(result.valid).toBe(false);
    expect(result.tooFarInFuture).toBe(true);
  });

  it("valid within past tolerance", () => {
    const { valid } = isTimestampValid(now - 3000, now);
    expect(valid).toBe(true);
  });

  it("invalid too far in past", () => {
    const result = isTimestampValid(now - 4000, now);
    expect(result.valid).toBe(false);
    expect(result.tooFarInPast).toBe(true);
  });
});
