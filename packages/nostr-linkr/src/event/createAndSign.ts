import type { NostrEvent, NostrSigner } from "../types/index.js";
import { createLinkEvent } from "./createLinkEvent.js";
import { hashAndPrepare } from "./hashEvent.js";
import { validateLinkEvent } from "./validateEvent.js";

/**
 * Full flow helper: create event, hash it, sign with a NIP-07 signer, validate.
 *
 * @param signer - A NIP-07 compatible signer (window.nostr)
 * @param ethereumAddress - The Ethereum address to link
 * @returns The fully signed and validated event ready for pushLink()
 * @throws Error if validation fails after signing
 */
export async function createAndSignLinkEvent(
  signer: NostrSigner,
  ethereumAddress: string,
): Promise<NostrEvent> {
  const pubkey = await signer.getPublicKey();
  const unsigned = createLinkEvent(ethereumAddress, pubkey);
  const hashed = hashAndPrepare(unsigned);
  const signed = await signer.signEvent(hashed);

  const { valid, errors } = validateLinkEvent(signed, ethereumAddress);
  if (!valid) {
    throw new Error(`Signed event validation failed: ${errors.join("; ")}`);
  }

  return signed;
}
