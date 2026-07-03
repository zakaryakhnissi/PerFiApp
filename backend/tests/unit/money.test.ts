import { describe, it, expect } from 'vitest';
import { roundHalfUpToCents, pointsToCents } from '../../src/modules/rewards/money/money.js';

describe('roundHalfUpToCents (Principle IV — explicit half-up rounding)', () => {
  it('rounds a half-cent up', () => {
    expect(roundHalfUpToCents('499.5')).toBe(500n);
  });

  it('rounds below the half down', () => {
    expect(roundHalfUpToCents('500.4')).toBe(500n);
  });

  it('rounds exactly 0.5 up', () => {
    expect(roundHalfUpToCents('0.5')).toBe(1n);
  });
});

describe('pointsToCents (FR-REW-001 — points × cents-per-point, half-up)', () => {
  // MANDATED fixture (tasks T017): 500,000 points × 1.05 cpp = $5,250.00 exactly, no slippage.
  it('values 500,000 points at 1.05 cpp as exactly 525000 cents ($5,250.00)', () => {
    expect(pointsToCents(500_000, '1.05')).toBe(525_000n);
  });

  it('rounds a fractional product half-up (333 × 1.5 cpp = 499.5 → 500 cents)', () => {
    expect(pointsToCents(333, '1.5')).toBe(500n);
  });

  it('returns integer minor units as bigint, never a float', () => {
    const cents = pointsToCents(1, '0.1');
    expect(typeof cents).toBe('bigint');
    expect(cents).toBe(0n); // 0.1 cent rounds half-up to 0
  });
});
