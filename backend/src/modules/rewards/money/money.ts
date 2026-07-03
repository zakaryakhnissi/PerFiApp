import Decimal from 'decimal.js';

/**
 * Money core for Module 1 — Rewards & Loyalty.
 *
 * Constitution Principle IV (Money Is Exact, NON-NEGOTIABLE):
 * - rates are arbitrary-precision decimals (decimal.js), never binary float;
 * - CAD amounts are integer minor units (cents) returned as `bigint`;
 * - rounding is explicit half-up, applied only at the final cent.
 */

/** Round a decimal amount of cents to integer minor units, half-up. */
export function roundHalfUpToCents(amountInCents: Decimal.Value): bigint {
  const rounded = new Decimal(amountInCents).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  return BigInt(rounded.toFixed(0));
}

/**
 * Value a points balance in CAD cents: points × cents-per-point, rounded half-up
 * to integer cents. Computed in arbitrary precision before the single rounding.
 */
export function pointsToCents(points: Decimal.Value, rateCentsPerPoint: Decimal.Value): bigint {
  const product = new Decimal(points).times(rateCentsPerPoint);
  return roundHalfUpToCents(product);
}

/**
 * Partner points obtained by transferring a source balance through a route:
 * points × transfer_ratio × bonus_multiplier, rounded half-up to integer points.
 * Omit `bonusMultiplier` (or pass an expired/stale bonus as 1) to fall back to the base route.
 */
export function transferPoints(
  points: Decimal.Value,
  ratio: Decimal.Value,
  bonusMultiplier: Decimal.Value = 1,
): bigint {
  const partner = new Decimal(points)
    .times(ratio)
    .times(bonusMultiplier)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  return BigInt(partner.toFixed(0));
}

/**
 * Convert a foreign-currency amount (in foreign minor units) to CAD cents using a
 * timestamped FX rate, in arbitrary precision and rounded half-up to integer CAD cents.
 * Callers must flag the result as stale when the FX rate's freshness is exceeded (Principle VIII).
 */
export function convertToCadCents(
  amountForeignMinorUnits: Decimal.Value,
  fxRateToCad: Decimal.Value,
): bigint {
  const product = new Decimal(amountForeignMinorUnits).times(fxRateToCad);
  return roundHalfUpToCents(product);
}

/**
 * Transfer-aware effective cents-per-point rate: base × ratio × bonus, in arbitrary
 * precision and NOT pre-rounded (rounding happens only at the final cent in `pointsToCents`).
 * Returns a Decimal so callers can chain further exact arithmetic.
 */
export function effectiveRateCpp(
  baseCentsPerPoint: Decimal.Value,
  ratio: Decimal.Value,
  bonusMultiplier: Decimal.Value = 1,
): Decimal {
  return new Decimal(baseCentsPerPoint).times(ratio).times(bonusMultiplier);
}
