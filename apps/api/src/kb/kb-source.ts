/**
 * Knowledgebase source loading. Production path: PostgreSQL, populated by the
 * seed step (research.md R4). Dev/test fallback: the validated files in
 * data/knowledgebase are read directly when DATABASE_URL is unset, so e2e
 * tests and local runs need no database. Both paths validate through
 * kb-schema — the shapes can never drift.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';
import {
  Card,
  CardSchema,
  RewardProgram,
  RewardProgramSchema,
  SpendCategory,
  SpendCategorySchema,
  findUnresolvedProgramRefs,
} from '@perfiapp/kb-schema';

export interface KbData {
  kbVersion: number;
  cards: Card[];
  programs: RewardProgram[];
  categories: SpendCategory[];
}

export const KB_DATA_DIR = join(__dirname, '..', '..', '..', '..', 'data', 'knowledgebase');

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function loadKbFromFiles(dataDir: string = KB_DATA_DIR): KbData {
  const cards = readdirSync(join(dataDir, 'cards'))
    .sort()
    .map((f) => CardSchema.parse(readJson(join(dataDir, 'cards', f))));
  const programs = readdirSync(join(dataDir, 'programs'))
    .sort()
    .map((f) => RewardProgramSchema.parse(readJson(join(dataDir, 'programs', f))));
  const categoriesRaw = readJson(join(dataDir, 'categories.json'));
  if (!Array.isArray(categoriesRaw)) throw new Error('categories.json must be an array');
  const categories = categoriesRaw.map((c) => SpendCategorySchema.parse(c));

  const unresolved = findUnresolvedProgramRefs(cards, programs);
  if (unresolved.length > 0) {
    throw new Error(`unresolved program references: ${unresolved.join(', ')}`);
  }
  // File mode has no seed counter; version 1 identifies "as-shipped" data.
  return { kbVersion: 1, cards, programs, categories };
}

export async function loadKbFromPostgres(databaseUrl: string): Promise<KbData> {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const [meta, cards, programs, categories] = await Promise.all([
      pool.query('SELECT kb_version FROM kb_meta LIMIT 1'),
      pool.query('SELECT doc FROM kb_cards ORDER BY id'),
      pool.query('SELECT doc FROM kb_programs ORDER BY id'),
      pool.query('SELECT doc FROM kb_categories ORDER BY position'),
    ]);
    return {
      kbVersion: Number(meta.rows[0]?.kb_version ?? 1),
      cards: cards.rows.map((r) => CardSchema.parse(r.doc)),
      programs: programs.rows.map((r) => RewardProgramSchema.parse(r.doc)),
      categories: categories.rows.map((r) => SpendCategorySchema.parse(r.doc)),
    };
  } finally {
    await pool.end();
  }
}

export async function loadKb(): Promise<KbData> {
  const databaseUrl = process.env['DATABASE_URL'];
  return databaseUrl ? loadKbFromPostgres(databaseUrl) : loadKbFromFiles();
}
