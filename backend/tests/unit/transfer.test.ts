import { describe, it, expect } from 'vitest';
import { transferPoints, effectiveRateCpp } from '../../src/modules/rewards/money/money.js';

describe('transferPoints (FR-REW-007/008 — points × ratio × bonus, integer result)', () => {
  // MANDATED fixture (tasks T055): 100,000 @ 1:1 route + 30% bonus → 130,000 partner pts, no drift.
  it('applies a 1:1 route with a 30% bonus: 100,000 → 130,000', () => {
    expect(transferPoints(100_000, '1', '1.30')).toBe(130_000n);
  });

  it('with no bonus, a 1:1 route is identity', () => {
    expect(transferPoints(100_000, '1')).toBe(100_000n);
  });

  it('applies a fractional ratio (1.5:1) exactly', () => {
    expect(transferPoints(1000, '1.5')).toBe(1_500n);
  });
});

describe('effectiveRateCpp (FR-REW-007 — transfer-aware rate, not pre-rounded)', () => {
  it('multiplies base × ratio × bonus in arbitrary precision', () => {
    expect(effectiveRateCpp('1.05', '1', '1.30').toString()).toBe('1.365');
  });

  it('falls back to the base rate when there is no bonus (expired/stale bonus path)', () => {
    expect(effectiveRateCpp('1.05', '1').toString()).toBe('1.05');
  });

  it('is exact, never binary float (0.07 × 3 = 0.21, not 0.2100000…2)', () => {
    expect(effectiveRateCpp('0.07', '3').toString()).toBe('0.21');
  });
});
