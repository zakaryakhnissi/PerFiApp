/**
 * @perfiapp/money — the ONLY entry point for money math (Constitution
 * Principle II). All values are integer minor units: cents (CAD), basis
 * points for earn rates, milli-cents (1/1000 cent) per point for valuations.
 * Rounding happens at exactly one boundary, half-even, implemented once here.
 */

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

export class InvalidAmountError extends MoneyError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAmountError';
  }
}

export interface Money {
  readonly amountCents: number;
  readonly currency: 'CAD';
}

/** $100.00 in cents — the ranking basis when no purchase amount is given. */
export const PER_HUNDRED_DOLLARS_CENTS = 10_000;

function assertNonNegativeSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new MoneyError(`${label} must be a non-negative safe integer, got ${value}`);
  }
}

/** Construct a CAD Money value from integer cents. */
export function money(amountCents: number): Money {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0) {
    throw new MoneyError(`amountCents must be a non-negative safe integer, got ${amountCents}`);
  }
  return { amountCents, currency: 'CAD' };
}

/** Exact addition of same-currency values. */
export function addMoney(a: Money, b: Money): Money {
  return money(a.amountCents + b.amountCents);
}

/** Earn rate in basis points: reward units per dollar × 100 (2% cash back = 200). */
export function rateBps(value: number): number {
  assertNonNegativeSafeInteger(value, 'rateBps');
  return value;
}

/** Point valuation in milli-cents per point (0.5¢/pt = 500). */
export function milliCentsPerPoint(value: number): number {
  assertNonNegativeSafeInteger(value, 'milliCentsPerPoint');
  return value;
}

/**
 * A purchase amount must be a positive, safe integer number of cents
 * (recommender contract C9).
 */
export function assertValidAmountCents(amountCents: number): void {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw new InvalidAmountError(
      `purchase amount must be a positive integer number of cents, got ${amountCents}`,
    );
  }
}

/**
 * Banker's rounding of the exact rational numerator/denominator to the
 * nearest integer; ties go to the even neighbour. Domain: numerator ≥ 0,
 * denominator > 0 (money quantities here are never negative).
 */
export function roundHalfEven(numerator: bigint, denominator: bigint): bigint {
  if (numerator < 0n) {
    throw new MoneyError(`roundHalfEven numerator must be >= 0, got ${numerator}`);
  }
  if (denominator <= 0n) {
    throw new MoneyError(`roundHalfEven denominator must be > 0, got ${denominator}`);
  }
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  const twiceRemainder = remainder * 2n;
  if (twiceRemainder < denominator) return quotient;
  if (twiceRemainder > denominator) return quotient + 1n;
  // exact tie: round to even
  return quotient % 2n === 0n ? quotient : quotient + 1n;
}

const BPS_DENOMINATOR = 10_000n;
const MILLI_CENTS_DENOMINATOR = 1_000n;

function toSafeNumber(value: bigint, label: string): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new MoneyError(`${label} exceeds the safe integer range`);
  }
  return Number(value);
}

/**
 * Cashback expected value in cents:
 * round_half_even(amountCents × rateBps / 10 000).
 */
export function cashbackValueCents(amountCents: number, bps: number): number {
  assertValidAmountCents(amountCents);
  assertNonNegativeSafeInteger(bps, 'rateBps');
  const value = roundHalfEven(BigInt(amountCents) * BigInt(bps), BPS_DENOMINATOR);
  return toSafeNumber(value, 'cashback value');
}

/**
 * Points expected value in cents, rounded ONCE at the end (no intermediate
 * rounding of points):
 * round_half_even(amountCents × rateBps × milliCentsPerPoint / 10 000 000).
 */
export function pointsValueCents(amountCents: number, bps: number, mcpp: number): number {
  assertValidAmountCents(amountCents);
  assertNonNegativeSafeInteger(bps, 'rateBps');
  assertNonNegativeSafeInteger(mcpp, 'milliCentsPerPoint');
  const value = roundHalfEven(
    BigInt(amountCents) * BigInt(bps) * BigInt(mcpp),
    BPS_DENOMINATOR * MILLI_CENTS_DENOMINATOR,
  );
  return toSafeNumber(value, 'points value');
}

/**
 * Points earned for display, in centi-points (1/100 point), rounded half-even.
 * Display-only — never an input to value math (which rounds once from the
 * exact product).
 */
export function pointsEarnedCentiPoints(amountCents: number, bps: number): number {
  assertValidAmountCents(amountCents);
  assertNonNegativeSafeInteger(bps, 'rateBps');
  const value = roundHalfEven(BigInt(amountCents) * BigInt(bps) * 100n, BPS_DENOMINATOR);
  return toSafeNumber(value, 'points earned');
}
