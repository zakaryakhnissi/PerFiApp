/**
 * T021 — contract e2e tests: invariants 1–5 from
 * contracts/knowledgebase-api.md plus filters, ETag behaviour, the error
 * envelope, and the SC-004 launch-coverage floor.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

let app: INestApplication;
let server: unknown;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  await app.init();
  server = app.getHttpServer();
});

afterAll(async () => {
  await app.close();
});

function walk(value: unknown, visit: (node: unknown, path: string) => void, path = '$'): void {
  visit(value, path);
  if (Array.isArray(value)) value.forEach((v, i) => walk(v, visit, `${path}[${i}]`));
  else if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) walk(v, visit, `${path}.${k}`);
  }
}

async function getJson(path: string): Promise<Record<string, unknown>> {
  const res = await request(server as Parameters<typeof request>[0]).get(path).expect(200);
  return res.body as Record<string, unknown>;
}

describe('contract invariants', () => {
  it('1 — every BilingualText has non-empty enCA and frCA in every payload', async () => {
    for (const path of ['/v1/cards', '/v1/reward-programs', '/v1/spend-categories']) {
      const body = await getJson(path);
      walk(body, (node, where) => {
        if (node !== null && typeof node === 'object' && !Array.isArray(node)) {
          const obj = node as Record<string, unknown>;
          if ('enCA' in obj || 'frCA' in obj) {
            expect(typeof obj['enCA']).toBe('string');
            expect(typeof obj['frCA']).toBe('string');
            expect((obj['enCA'] as string).length).toBeGreaterThan(0);
            expect((obj['frCA'] as string).length).toBeGreaterThan(0);
            if ((obj['enCA'] as string).length === 0) throw new Error(`empty enCA at ${where}`);
          }
        }
      });
    }
  });

  it('2 — every points card programId resolves within the payload version', async () => {
    const cardsBody = await getJson('/v1/cards');
    const programsBody = await getJson('/v1/reward-programs');
    const programIds = new Set(
      (programsBody['programs'] as Array<{ id: string }>).map((p) => p.id),
    );
    for (const card of cardsBody['cards'] as Array<{
      id: string;
      rewardCurrency: { kind: string; programId?: string };
    }>) {
      if (card.rewardCurrency.kind === 'points') {
        expect(programIds.has(card.rewardCurrency.programId as string)).toBe(true);
      }
    }
  });

  it('3 — kbVersion is identical across the three list endpoints', async () => {
    const [a, b, c] = await Promise.all([
      getJson('/v1/cards'),
      getJson('/v1/reward-programs'),
      getJson('/v1/spend-categories'),
    ]);
    expect(a['kbVersion']).toBe(b['kbVersion']);
    expect(b['kbVersion']).toBe(c['kbVersion']);
  });

  it('4 — no float appears anywhere in any payload', async () => {
    for (const path of ['/v1/cards', '/v1/reward-programs', '/v1/spend-categories', '/v1/kb-version']) {
      const body = await getJson(path);
      walk(body, (node, where) => {
        if (typeof node === 'number' && !Number.isInteger(node)) {
          throw new Error(`non-integer number ${node} at ${where} in ${path}`);
        }
      });
    }
  });

  it('5 — every Card.dataAsOf parses as an ISO date', async () => {
    const body = await getJson('/v1/cards');
    for (const card of body['cards'] as Array<{ dataAsOf: string }>) {
      expect(card.dataAsOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(card.dataAsOf))).toBe(false);
    }
  });
});

describe('endpoints', () => {
  it('GET /v1/kb-version returns a positive integer', async () => {
    const body = await getJson('/v1/kb-version');
    expect(Number.isInteger(body['kbVersion'])).toBe(true);
    expect(body['kbVersion'] as number).toBeGreaterThanOrEqual(1);
  });

  it('GET /v1/spend-categories returns exactly the 10 fixed categories', async () => {
    const body = await getJson('/v1/spend-categories');
    expect((body['categories'] as unknown[]).length).toBe(10);
  });

  it('GET /v1/cards meets the SC-004 floor: ≥30 cards across ≥5 issuers', async () => {
    const body = await getJson('/v1/cards');
    const cards = body['cards'] as Array<{ issuer: { enCA: string } }>;
    expect(cards.length).toBeGreaterThanOrEqual(30);
    expect(new Set(cards.map((c) => c.issuer.enCA)).size).toBeGreaterThanOrEqual(5);
  });

  it('filter noAnnualFee=true returns only $0-fee cards', async () => {
    const body = await getJson('/v1/cards?noAnnualFee=true');
    const cards = body['cards'] as Array<{ annualFee: { amountCents: number } }>;
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) expect(card.annualFee.amountCents).toBe(0);
  });

  it('filter bonusCategory=groceries returns only cards with a groceries bonus', async () => {
    const body = await getJson('/v1/cards?bonusCategory=groceries');
    const cards = body['cards'] as Array<{ earnRates: { byCategory: Record<string, number> } }>;
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) expect(card.earnRates.byCategory['groceries']).toBeDefined();
  });

  it('search q matches both languages', async () => {
    const en = await getJson('/v1/cards?q=cash back');
    const fr = await getJson('/v1/cards?q=remises');
    expect((en['cards'] as unknown[]).length).toBeGreaterThan(0);
    expect((fr['cards'] as unknown[]).length).toBeGreaterThan(0);
  });

  it('GET /v1/cards/:id returns the card; unknown id returns the error envelope', async () => {
    const list = await getJson('/v1/cards');
    const firstId = (list['cards'] as Array<{ id: string }>)[0]!.id;
    const card = await getJson(`/v1/cards/${firstId}`);
    expect(card['id']).toBe(firstId);

    const res = await request(server as Parameters<typeof request>[0])
      .get('/v1/cards/does-not-exist')
      .expect(404);
    const error = (res.body as { error: { code: string; message: { enCA: string; frCA: string } } })
      .error;
    expect(error.code).toBe('CARD_NOT_FOUND');
    expect(error.message.enCA.length).toBeGreaterThan(0);
    expect(error.message.frCA.length).toBeGreaterThan(0);
  });

  it('list endpoints support ETag / If-None-Match → 304', async () => {
    const first = await request(server as Parameters<typeof request>[0]).get('/v1/cards').expect(200);
    const etag = first.headers['etag'];
    expect(etag).toBeDefined();
    await request(server as Parameters<typeof request>[0])
      .get('/v1/cards')
      .set('If-None-Match', etag as string)
      .expect(304);
  });
});
