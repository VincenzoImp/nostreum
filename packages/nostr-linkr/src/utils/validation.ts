import { MAX_FUTURE_TOLERANCE, MAX_PAST_TOLERANCE } from "../constants/index.js";

/**
 * Check if a timestamp is within the contract's acceptable window.
 */
export function isTimestampValid(
  createdAt: number,
  referenceTime?: number,
): { valid: boolean; tooFarInFuture: boolean; tooFarInPast: boolean } {
  const now = referenceTime ?? Math.floor(Date.now() / 1000);
  const tooFarInFuture = createdAt > now + MAX_FUTURE_TOLERANCE;
  const tooFarInPast = createdAt < now - MAX_PAST_TOLERANCE;
  return {
    valid: !tooFarInFuture && !tooFarInPast,
    tooFarInFuture,
    tooFarInPast,
  };
}
