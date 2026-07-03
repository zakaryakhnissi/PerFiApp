/**
 * Knowledgebase cache (research.md R4/R5): full snapshot cached on-device
 * with its kbVersion; refreshed when the API reports a newer version. Both
 * languages are in the payload, so language switching works offline.
 */
import {
  KnowledgebaseSnapshotSchema,
  type Card,
  type KnowledgebaseSnapshot,
} from '@perfiapp/kb-schema';
import { readValidated, write } from './storage';

const KB_KEY = 'perfiapp.kb-snapshot.v1';
const DEFAULT_BASE_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3000';

let inMemory: KnowledgebaseSnapshot | null = null;

/** Test/dev hook: preload a snapshot without network or storage. */
export function primeSnapshot(snapshot: KnowledgebaseSnapshot): void {
  inMemory = snapshot;
}

export async function getSnapshot(): Promise<KnowledgebaseSnapshot | null> {
  if (inMemory) return inMemory;
  inMemory = await readValidated(KB_KEY, KnowledgebaseSnapshotSchema);
  return inMemory;
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GET ${url} -> ${response.status}`);
  return response.json();
}

/**
 * Refresh the cache if the server has a newer kbVersion (or nothing is
 * cached). Offline or server errors leave the existing cache untouched.
 */
export async function refreshSnapshot(baseUrl: string = DEFAULT_BASE_URL): Promise<KnowledgebaseSnapshot | null> {
  const cached = await getSnapshot();
  try {
    const version = (await fetchJson(`${baseUrl}/v1/kb-version`)) as { kbVersion: number };
    if (cached && cached.kbVersion >= version.kbVersion) return cached;

    const [cardsRes, programsRes, categoriesRes] = await Promise.all([
      fetchJson(`${baseUrl}/v1/cards`) as Promise<{ kbVersion: number; cards: unknown[] }>,
      fetchJson(`${baseUrl}/v1/reward-programs`) as Promise<{ programs: unknown[] }>,
      fetchJson(`${baseUrl}/v1/spend-categories`) as Promise<{ categories: unknown[] }>,
    ]);
    const snapshot = KnowledgebaseSnapshotSchema.parse({
      schemaVersion: 1,
      kbVersion: cardsRes.kbVersion,
      fetchedAt: new Date().toISOString(),
      cards: cardsRes.cards,
      programs: programsRes.programs,
      categories: categoriesRes.categories,
    });
    await write(KB_KEY, snapshot);
    inMemory = snapshot;
    return snapshot;
  } catch {
    return cached; // offline-first: stale beats broken (quickstart scenario 6)
  }
}

export function findCard(snapshot: KnowledgebaseSnapshot, cardId: string): Card | undefined {
  return snapshot.cards.find((c) => c.id === cardId);
}
