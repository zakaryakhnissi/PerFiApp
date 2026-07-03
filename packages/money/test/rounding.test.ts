/**
 * T006 — Principle II / V gate: these tests are committed and MUST fail before
 * packages/money/src exists. Rounding is half-even (banker's) at the single
 * documented boundary (research.md R2, data-model.md "Rounding rule").
 */
import fc from 'fast-check';
import {
  roundHalfEven,
  cashbackValueCents,
  pointsValueCents,
  InvalidAmountError,
  assertValidAmountCents,
} from '../src';

describe('roundHalfEven(numerator, denominator)', () => {
  it('rounds exact halves to the even neighbour', () => {
    expect(roundHalfEven(25n, 10n)).toBe(2n); // 2.5 -> 2
    expect(roundHalfEven(35n, 10n)).toBe(4n); // 3.5 -> 4
    expect(roundHalfEven(45n, 10n)).toBe(4n); // 4.5 -> 4
    expect(roundHalfEven(55n, 10n)).toBe(6n); // 5.5 -> 6
    expect(roundHalfEven(5n, 10n)).toBe(0n); // 0.5 -> 0
    expect(roundHalfEven(15n, 10n)).toBe(2n); // 1.5 -> 2
  });

  it('rounds non-halves to the nearest integer', () => {
    expect(roundHalfEven(24n, 10n)).toBe(2n);
    expect(roundHalfEven(26n, 10n)).toBe(3n);
    expect(roundHalfEven(249n, 100n)).toBe(2n);
    expect(roundHalfEven(251n, 100n)).toBe(3n);
  });

  it('is exact for whole results', () => {
    expect(roundHalfEven(200n, 10n)).toBe(20n);
    expect(roundHalfEven(0n, 7n)).toBe(0n);
  });

  it('rejects negative numerators and non-positive denominators', () => {
    expect(() => roundHalfEven(-1n, 10n)).toThrow();
    expect(() => roundHalfEven(1n, 0n)).toThrow();
    expect(() => roundHalfEven(1n, -5n)).toThrow();
  });

  it('property: result differs from the exact rational by at most 1/2', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 0n, max: 10n ** 15n }),
        fc.bigInt({ min: 1n, max: 10n ** 6n }),
        (num, den) => {
          const r = roundHalfEven(num, den);
          // |r*den - num| <= den/2  (ties allowed at exactly den/2)
          const diff = r * den > num ? r * den - num : num - r * den;
          return diff * 2n <= den;
        },
      ),
    );
  });
});

describe('cashbackValueCents(amountCents, rateBps)', () => {
  it('computes spec oracle: $100.00 at 2% = $2.00', () => {
    expect(cashbackValueCents(10_000, 200)).toBe(200);
  });

  it('half-even at the .5-cent boundary in the cashback path', () => {
    expect(cashbackValueCents(125, 200)).toBe(2); // 2.5 cents -> 2
    expect(cashbackValueCents(175, 200)).toBe(4); // 3.5 cents -> 4
  });

  it('zero rate earns zero', () => {
    expect(cashbackValueCents(10_000, 0)).toBe(0);
  });

  it('rejects non-integer or non-positive amounts', () => {
    expect(() => cashbackValueCents(0, 200)).toThrow(InvalidAmountError);
    expect(() => cashbackValueCents(-100, 200)).toThrow(InvalidAmountError);
    expect(() => cashbackValueCents(10.5, 200)).toThrow(InvalidAmountError);
  });
});

describe('pointsValueCents(amountCents, rateBps, milliCentsPerPoint)', () => {
  it('computes spec oracle: $100.00 at 1 pt/$ valued 1.5 cents/pt = $1.50', () => {
    // 1 pt/$ = 100 bps; 1.5 cents/pt = 1500 milli-cents/pt
    expect(pointsValueCents(10_000, 100, 1500)).toBe(150);
  });

  it('conservative default valuation: 0.5 cents/pt = 500 milli-cents', () => {
    expect(pointsValueCents(10_000, 100, 500)).toBe(50);
  });

  it('half-even at the .5-cent boundary in the points path', () => {
    // 100 cents * 100bps = 1 point; 1 pt * 2500 milli-cents = 2.5 cents -> 2
    expect(pointsValueCents(100, 100, 2500)).toBe(2);
    // 300 cents * 100bps = 3 points; 3 * 500 = 1.5 cents -> 2
    expect(pointsValueCents(300, 100, 500)).toBe(2);
  });

  it('single rounding boundary: no intermediate rounding of points', () => {
    // 150 cents at 1pt/$ = 1.5 points exactly; 1.5 pt * 1000 milli-cents = 1.5 cents -> 2 (half-even)
    // two-stage rounding (points first) would give 2 pts -> 2 cents too, so pick a
    // case that distinguishes: 50 cents at 1pt/$ = 0.5 pt * 3000 mc = 1.5 cents -> 2;
    // two-stage would round 0.5 pt -> 0 pt -> 0 cents. Single-stage is required.
    expect(pointsValueCents(50, 100, 3000)).toBe(2);
  });

  it('rejects invalid amounts', () => {
    expect(() => pointsValueCents(0, 100, 500)).toThrow(InvalidAmountError);
    expect(() => pointsValueCents(12.3, 100, 500)).toThrow(InvalidAmountError);
  });
});

describe('assertValidAmountCents', () => {
  it('accepts positive safe integers', () => {
    expect(() => assertValidAmountCents(1)).not.toThrow();
    expect(() => assertValidAmountCents(10_000)).not.toThrow();
  });
  it('rejects zero, negatives, fractions, unsafe and non-finite values', () => {
    for (const bad of [0, -1, 0.5, NaN, Infinity, 2 ** 53]) {
      expect(() => assertValidAmountCents(bad)).toThrow(InvalidAmountError);
    }
  });
});
