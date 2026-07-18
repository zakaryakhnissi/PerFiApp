/**
 * T030 — plan.md performance goal: recommendation computed on-device in
 * <50 ms for a 10-card wallet (supports SC-001's end-to-end target).
 */
import { rankCards } from '../src';
import { GROCERIES, makeCard, makeProgram, makeSnapshot, walletOf } from './fixtures';

describe('performance', () => {
  it('ranks a 10-card wallet in under 50 ms (median of 50 runs)', () => {
    const programs = [0, 1, 2].map((i) =>
      makeProgram({
        id: `prog-${i}`,
        valuation: { milliCentsPerPoint: 500 + i * 500, source: 't', asOf: '2026-07-03', isDefault: false },
      }),
    );
    const cards = Array.from({ length: 10 }, (_, i) =>
      makeCard({
        id: `card-${String(i).padStart(2, '0')}`,
        annualFee: { amountCents: (i % 4) * 3_000, currency: 'CAD' },
        rewardCurrency: i % 3 === 0 ? { kind: 'points', programId: `prog-${i % 3}` } : { kind: 'cashback' },
        earnRates: { base: 50 + i * 10, byCategory: i % 2 === 0 ? { groceries: 300 } : {} },
      }),
    );
    const snapshot = makeSnapshot(cards, programs);
    const wallet = walletOf(...cards.map((c) => c.id));

    // warm-up (JIT)
    for (let i = 0; i < 10; i += 1) rankCards({ wallet, snapshot, categoryId: GROCERIES, amountCents: 12_345 });

    const samples: number[] = [];
    for (let i = 0; i < 50; i += 1) {
      const start = process.hrtime.bigint();
      rankCards({ wallet, snapshot, categoryId: GROCERIES, amountCents: 12_345 });
      samples.push(Number(process.hrtime.bigint() - start) / 1_000_000);
    }
    samples.sort((a, b) => a - b);
    const median = samples[Math.floor(samples.length / 2)]!;
    expect(median).toBeLessThan(50);
  });
});
