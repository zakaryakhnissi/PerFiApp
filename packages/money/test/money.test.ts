/**
 * T007 — Money value type and rate/valuation constructors (data-model.md value
 * types). Committed failing before implementation (Principle V).
 */
import fc from 'fast-check';
import {
  money,
  addMoney,
  rateBps,
  milliCentsPerPoint,
  MoneyError,
  PER_HUNDRED_DOLLARS_CENTS,
  type Money,
} from '../src';

describe('money(amountCents)', () => {
  it('constructs integer-cent CAD values', () => {
    const m = money(12_345);
    expect(m).toEqual({ amountCents: 12_345, currency: 'CAD' });
  });

  it('accepts zero (fees can be $0)', () => {
    expect(money(0).amountCents).toBe(0);
  });

  it('rejects fractions, negatives, non-finite and unsafe integers', () => {
    for (const bad of [0.1, -1, NaN, Infinity, -Infinity, 2 ** 53]) {
      expect(() => money(bad)).toThrow(MoneyError);
    }
  });

  it('property: any safe non-negative integer round-trips', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER - 1 }), (n) => {
        return money(n).amountCents === n;
      }),
    );
  });
});

describe('addMoney', () => {
  it('adds same-currency amounts exactly', () => {
    const sum: Money = addMoney(money(1), money(2));
    expect(sum.amountCents).toBe(3);
  });

  it('property: addition is associative and commutative on cents', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 ** 40 }),
        fc.integer({ min: 0, max: 2 ** 40 }),
        fc.integer({ min: 0, max: 2 ** 40 }),
        (a, b, c) => {
          const l = addMoney(addMoney(money(a), money(b)), money(c)).amountCents;
          const r = addMoney(money(a), addMoney(money(b), money(c))).amountCents;
          const comm = addMoney(money(b), money(a)).amountCents;
          return l === r && comm === a + b;
        },
      ),
    );
  });
});

describe('rateBps / milliCentsPerPoint constructors', () => {
  it('accept non-negative integers', () => {
    expect(rateBps(0)).toBe(0);
    expect(rateBps(200)).toBe(200);
    expect(milliCentsPerPoint(500)).toBe(500);
  });

  it('reject fractional or negative rates (rates are integer sub-units, never floats)', () => {
    for (const bad of [1.5, -100, NaN, Infinity]) {
      expect(() => rateBps(bad)).toThrow(MoneyError);
      expect(() => milliCentsPerPoint(bad)).toThrow(MoneyError);
    }
  });
});

describe('constants', () => {
  it('per-$100 basis is 10,000 cents (spec US1 scenario 2)', () => {
    expect(PER_HUNDRED_DOLLARS_CENTS).toBe(10_000);
  });
});
