/** Error codes for programmatic error handling. */
export enum NostrLinkrErrorCode {
  NO_DEPLOYMENT = "NO_DEPLOYMENT",
  NO_WALLET_CLIENT = "NO_WALLET_CLIENT",
  INVALID_PUBKEY = "INVALID_PUBKEY",
  INVALID_SIGNATURE = "INVALID_SIGNATURE",
  INVALID_ADDRESS = "INVALID_ADDRESS",
  INVALID_EVENT_KIND = "INVALID_EVENT_KIND",
  INVALID_TIMESTAMP = "INVALID_TIMESTAMP",
  INVALID_TAGS = "INVALID_TAGS",
  CONTENT_MISMATCH = "CONTENT_MISMATCH",
  EVENT_ID_MISMATCH = "EVENT_ID_MISMATCH",
  CONTRACT_REVERTED = "CONTRACT_REVERTED",
  CONTRACT_PAUSED = "CONTRACT_PAUSED",
  NO_LINK_EXISTS = "NO_LINK_EXISTS",
  SIGNER_REJECTED = "SIGNER_REJECTED",
}

/** Base error class for all nostr-linkr errors. */
export class NostrLinkrError extends Error {
  constructor(
    message: string,
    public readonly code: NostrLinkrErrorCode,
  ) {
    super(message);
    this.name = "NostrLinkrError";
  }
}

/** Thrown when a write method is called without a walletClient. */
export class NoWalletClientError extends NostrLinkrError {
  constructor() {
    super(
      "A walletClient is required for write operations. Pass it in createNostrLinkrClient config.",
      NostrLinkrErrorCode.NO_WALLET_CLIENT,
    );
    this.name = "NoWalletClientError";
  }
}

/** Thrown when validation of event parameters fails before contract submission. */
export class ValidationError extends NostrLinkrError {
  constructor(
    message: string,
    public readonly errors: string[],
  ) {
    super(message, NostrLinkrErrorCode.CONTENT_MISMATCH);
    this.name = "ValidationError";
  }
}

/** Thrown when the contract reverts, with parsed revert reason. */
export class ContractRevertError extends NostrLinkrError {
  constructor(
    message: string,
    public readonly revertReason: string,
    public readonly transactionHash?: `0x${string}`,
  ) {
    super(message, NostrLinkrErrorCode.CONTRACT_REVERTED);
    this.name = "ContractRevertError";
  }
}
