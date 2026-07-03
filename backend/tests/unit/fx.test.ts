import { describe, it, expect } from 'vitest';
import { convertToCadCents } from '../../src/modules/rewards/money/money.js';

describe('convertToCadCents (FR-X-002 / multi-currency — foreign minor units × FX → CAD cents, half-up)', () => {
  it('converts 10000 foreign cents at 1.37 to 13700 CAD cents ($137.00)', () => {
    expect(convertToCadCents(10_000, '1.37')).toBe(13_700n);
  });

  it('rounds a fractional conversion half-up (333 × 1.5 = 499.5 → 500)', () => {
    expect(convertToCadCents(333, '1.5')).toBe(500n);
  });

  it('is exact under a rate that would drift in float (19 × 1.1 = 20.9 → 21)', () => {
    expect(convertToCadCents(19, '1.1')).toBe(21n);
  });
});
