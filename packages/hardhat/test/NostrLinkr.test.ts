import { expect } from "chai";
import { ethers } from "hardhat";
import { NostrLinkr } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("NostrLinkr", function () {
  let nostrLinkr: NostrLinkr;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;

  // Test constants
  const VALID_PUBKEY = "0x3bf0c63fcb93463407af97a5e5ee64fa883d107ef9e558472c4eb9aaaefa459d";
  const VALID_PUBKEY_2 = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  const ZERO_PUBKEY = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const VALID_KIND = 27235n;
  const VALID_TAGS = "[]";

  // 64-byte signature with valid range values
  const VALID_SIG =
    "0x" +
    "0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b" +
    "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b";

  beforeEach(async () => {
    [owner, user1] = await ethers.getSigners();
    const NostrLinkrFactory = await ethers.getContractFactory("NostrLinkr");
    nostrLinkr = (await NostrLinkrFactory.deploy()) as NostrLinkr;
    await nostrLinkr.waitForDeployment();
  });

  describe("Deployment", () => {
    it("should set the deployer as owner", async () => {
      expect(await nostrLinkr.owner()).to.equal(owner.address);
    });

    it("should start unpaused", async () => {
      expect(await nostrLinkr.paused()).to.equal(false);
    });

    it("should have empty mappings initially", async () => {
      expect(await nostrLinkr.addressPubkey(user1.address)).to.equal(ZERO_PUBKEY);
      expect(await nostrLinkr.pubkeyAddress(VALID_PUBKEY)).to.equal(ethers.ZeroAddress);
    });
  });

  describe("Pause/Unpause", () => {
    it("should allow owner to pause", async () => {
      await nostrLinkr.connect(owner).pause();
      expect(await nostrLinkr.paused()).to.equal(true);
    });

    it("should allow owner to unpause", async () => {
      await nostrLinkr.connect(owner).pause();
      await nostrLinkr.connect(owner).unpause();
      expect(await nostrLinkr.paused()).to.equal(false);
    });

    it("should revert when non-owner tries to pause", async () => {
      await expect(nostrLinkr.connect(user1).pause()).to.be.revertedWithCustomError(
        nostrLinkr,
        "OwnableUnauthorizedAccount",
      );
    });

    it("should revert when non-owner tries to unpause", async () => {
      await nostrLinkr.connect(owner).pause();
      await expect(nostrLinkr.connect(user1).unpause()).to.be.revertedWithCustomError(
        nostrLinkr,
        "OwnableUnauthorizedAccount",
      );
    });
  });

  describe("pushLinkr validation", () => {
    it("should revert with invalid signature length", async () => {
      const shortSig = "0x1234";
      const now = Math.floor(Date.now() / 1000);
      const content = user1.address.toLowerCase().slice(2);
      const fakeId = ethers.keccak256("0x00");

      await expect(
        nostrLinkr.connect(user1).pushLinkr(fakeId, VALID_PUBKEY, now, VALID_KIND, VALID_TAGS, content, shortSig),
      ).to.be.revertedWith("Invalid signature length");
    });

    it("should revert with invalid event kind", async () => {
      const now = Math.floor(Date.now() / 1000);
      const content = user1.address.toLowerCase().slice(2);
      const fakeId = ethers.keccak256("0x00");
      const wrongKind = 1n; // Should be 27235

      await expect(
        nostrLinkr.connect(user1).pushLinkr(fakeId, VALID_PUBKEY, now, wrongKind, VALID_TAGS, content, VALID_SIG),
      ).to.be.revertedWith("Invalid kind for Nostr Linkr");
    });

    it("should revert with timestamp too far in the future", async () => {
      const futureTime = Math.floor(Date.now() / 1000) + 600; // 10 minutes in future (> 5 min tolerance)
      const content = user1.address.toLowerCase().slice(2);
      const fakeId = ethers.keccak256("0x00");

      await expect(
        nostrLinkr
          .connect(user1)
          .pushLinkr(fakeId, VALID_PUBKEY, futureTime, VALID_KIND, VALID_TAGS, content, VALID_SIG),
      ).to.be.revertedWith("CreatedAt too far in the future");
    });

    it("should revert with timestamp too far in the past", async () => {
      const pastTime = Math.floor(Date.now() / 1000) - 7200; // 2 hours ago (> 1 hour tolerance)
      const content = user1.address.toLowerCase().slice(2);
      const fakeId = ethers.keccak256("0x00");

      await expect(
        nostrLinkr.connect(user1).pushLinkr(fakeId, VALID_PUBKEY, pastTime, VALID_KIND, VALID_TAGS, content, VALID_SIG),
      ).to.be.revertedWith("CreatedAt too far in the past");
    });

    it("should revert with non-empty tags", async () => {
      const now = Math.floor(Date.now() / 1000);
      const content = user1.address.toLowerCase().slice(2);
      const fakeId = ethers.keccak256("0x00");
      const invalidTags = '[["p","abc"]]';

      await expect(
        nostrLinkr.connect(user1).pushLinkr(fakeId, VALID_PUBKEY, now, VALID_KIND, invalidTags, content, VALID_SIG),
      ).to.be.revertedWith("Tags must be empty for Nostr Linkr");
    });

    it("should revert when content doesn't match sender address", async () => {
      const now = Math.floor(Date.now() / 1000);
      const wrongContent = "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef"; // Not sender's address
      const fakeId = ethers.keccak256("0x00");

      await expect(
        nostrLinkr.connect(user1).pushLinkr(fakeId, VALID_PUBKEY, now, VALID_KIND, VALID_TAGS, wrongContent, VALID_SIG),
      ).to.be.revertedWith("Content must be sender's address without 0x prefix");
    });

    it("should revert when paused", async () => {
      await nostrLinkr.connect(owner).pause();

      const now = Math.floor(Date.now() / 1000);
      const content = user1.address.toLowerCase().slice(2);
      const fakeId = ethers.keccak256("0x00");

      await expect(
        nostrLinkr.connect(user1).pushLinkr(fakeId, VALID_PUBKEY, now, VALID_KIND, VALID_TAGS, content, VALID_SIG),
      ).to.be.revertedWithCustomError(nostrLinkr, "EnforcedPause");
    });
  });

  describe("pullLinkr", () => {
    it("should revert when no link exists", async () => {
      await expect(nostrLinkr.connect(user1).pullLinkr()).to.be.revertedWith("No link found for this address");
    });
  });

  describe("verifyNostrEvent", () => {
    it("should revert with invalid signature length", async () => {
      const fakeId = ethers.keccak256("0x00");
      const shortSig = "0x1234";

      await expect(
        nostrLinkr.verifyNostrEvent(fakeId, VALID_PUBKEY, 1000, 27235, "[]", "test", shortSig),
      ).to.be.revertedWith("Signature must be 64 bytes");
    });

    it("should revert when event ID doesn't match computed hash", async () => {
      const wrongId = ethers.keccak256("0x00"); // Will not match the computed hash
      const now = 1700000000;

      await expect(
        nostrLinkr.verifyNostrEvent(wrongId, VALID_PUBKEY, now, 27235, "[]", "test", VALID_SIG),
      ).to.be.revertedWith("Event ID mismatch");
    });
  });

  describe("getEventHash consistency", () => {
    it("should produce consistent hashes with verifyNostrEvent serialization", async () => {
      const pubkey = VALID_PUBKEY;
      const createdAt = 1700000000;
      const kind = 27235;
      const tags = "[]";
      const content = "test_content_address";

      // getEventHash should produce the same hash as the internal serialization in verifyNostrEvent
      const hash = await nostrLinkr.getEventHash(pubkey, createdAt, kind, tags, content);

      // The hash should be non-zero (valid computation)
      expect(hash).to.not.equal(ZERO_PUBKEY);

      // If we call verifyNostrEvent with this hash as eventId, it should NOT revert
      // with "Event ID mismatch" (it may revert on signature verification instead)
      try {
        await nostrLinkr.verifyNostrEvent(hash, pubkey, createdAt, kind, tags, content, VALID_SIG);
      } catch (error: any) {
        // Should fail on Schnorr verification, NOT on "Event ID mismatch"
        expect(error.message).to.not.include("Event ID mismatch");
      }
    });
  });

  describe("Utility functions via getEventHash", () => {
    it("should compute non-zero hash for valid inputs", async () => {
      const hash = await nostrLinkr.getEventHash(VALID_PUBKEY, 1700000000, 27235, "[]", "test");
      expect(hash).to.not.equal(ZERO_PUBKEY);
    });

    it("should produce different hashes for different inputs", async () => {
      const hash1 = await nostrLinkr.getEventHash(VALID_PUBKEY, 1700000000, 27235, "[]", "content1");
      const hash2 = await nostrLinkr.getEventHash(VALID_PUBKEY, 1700000000, 27235, "[]", "content2");
      expect(hash1).to.not.equal(hash2);
    });

    it("should produce different hashes for different timestamps", async () => {
      const hash1 = await nostrLinkr.getEventHash(VALID_PUBKEY, 1700000000, 27235, "[]", "test");
      const hash2 = await nostrLinkr.getEventHash(VALID_PUBKEY, 1700000001, 27235, "[]", "test");
      expect(hash1).to.not.equal(hash2);
    });

    it("should produce different hashes for different pubkeys", async () => {
      const hash1 = await nostrLinkr.getEventHash(VALID_PUBKEY, 1700000000, 27235, "[]", "test");
      const hash2 = await nostrLinkr.getEventHash(VALID_PUBKEY_2, 1700000000, 27235, "[]", "test");
      expect(hash1).to.not.equal(hash2);
    });
  });
});
