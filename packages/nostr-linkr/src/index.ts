// Client
export { createNostrLinkrClient } from "./client.js";
export type { NostrLinkrClient } from "./client.js";

// Types
export type {
  NostrEvent,
  UnsignedNostrEvent,
  HashedNostrEvent,
  NostrSigner,
  NostrProfile,
  PushLinkrParams,
  IdentityLink,
  BatchLookupResult,
  LinkrEventLog,
  LinkrEventFilter,
  NostrLinkrClientConfig,
  DeploymentInfo,
} from "./types/index.js";

// ABI
export { nostrLinkrAbi } from "./abi/index.js";

// Constants
export {
  DEPLOYMENTS,
  getDeployment,
  getSupportedChainIds,
  NOSTR_LINKR_EVENT_KIND,
  NOSTR_EVENT_KINDS,
  MAX_FUTURE_TOLERANCE,
  MAX_PAST_TOLERANCE,
} from "./constants/index.js";

// Event utilities
export {
  createLinkEvent,
  serializeEvent,
  hashEvent,
  hashAndPrepare,
  validateLinkEvent,
  createAndSignLinkEvent,
} from "./event/index.js";

// Utils
export {
  pubkeyToBytes32,
  bytes32ToPubkey,
  sigToHex,
  isValidPubkey,
  isValidSchnorrSig,
  addressToContent,
  isValidAddressContent,
  isZeroAddress,
  isTimestampValid,
  buildPubkeyBatchCalls,
  buildAddressBatchCalls,
} from "./utils/index.js";

// Errors
export {
  NostrLinkrErrorCode,
  NostrLinkrError,
  NoWalletClientError,
  ValidationError,
  ContractRevertError,
} from "./errors/index.js";
